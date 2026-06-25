const prisma = require('../models/prisma')
const jwt = require('jsonwebtoken')

const messageInclude = {
    sender: { select: { id: true, username: true, avatarUrl: true } },
    reactions: { include: { user: { select: { id: true, username: true } } } },
    replyTo: {
        select: {
            id: true,
            content: true,
            fileUrl: true,
            sender: { select: { id: true, username: true } }
        }
    }
}

module.exports = (io) => {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token

        if (!token) {
            return next(new Error('No token provided'))
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            socket.user = decoded
            next()
        } catch (err) {
            next(new Error('Invalid token'))
        }
    })

    io.on('connection', (socket) => {
        console.log(`${socket.user.username} connected`)
        socket.join(socket.user.id)

        prisma.user.update({
            where: { id: socket.user.id },
            data: { isOnline: true, lastSeenAt: new Date() }
        }).then(() => {
            io.emit('presence:update', {
                userId: socket.user.id,
                isOnline: true
            })
        })

        // send message (with optional replyToId)
        socket.on('message:send', async (data, callback) => {
            const { conversationId, content, replyToId } = data

            try {
                const conversation = await prisma.conversation.findFirst({
                    where: {
                        id: conversationId,
                        OR: [
                            { participant1Id: socket.user.id },
                            { participant2Id: socket.user.id }
                        ]
                    }
                })

                if (!conversation) {
                    return callback({ error: 'Conversation not found' })
                }

                const message = await prisma.message.create({
                    data: {
                        content,
                        conversationId,
                        senderId: socket.user.id,
                        replyToId: replyToId || null
                    },
                    include: messageInclude
                })

                const recipientId = conversation.participant1Id === socket.user.id
                    ? conversation.participant2Id
                    : conversation.participant1Id

                io.to(recipientId).emit('message:receive', message)
                callback({ message })
            } catch (err) {
                console.error(err)
                callback({ error: 'Failed to send message' })
            }
        })

        // delete message (soft delete)
        socket.on('message:delete', async (data, callback) => {
            const { messageId } = data

            try {
                const message = await prisma.message.findUnique({
                    where: { id: messageId },
                    include: { conversation: true }
                })

                if (!message || message.senderId !== socket.user.id) {
                    return callback({ error: 'Cannot delete this message' })
                }

                await prisma.message.update({
                    where: { id: messageId },
                    data: { deletedAt: new Date() }
                })

                const recipientId = message.conversation.participant1Id === socket.user.id
                    ? message.conversation.participant2Id
                    : message.conversation.participant1Id

                io.to(recipientId).emit('message:deleted', { messageId })
                callback({ success: true, messageId })
            } catch (err) {
                console.error(err)
                callback({ error: 'Failed to delete message' })
            }
        })

        // add reaction
        socket.on('message:react', async (data, callback) => {
            const { messageId, emoji } = data

            try {
                const message = await prisma.message.findUnique({
                    where: { id: messageId },
                    include: { conversation: true }
                })

                if (!message) return callback({ error: 'Message not found' })

                const reaction = await prisma.reaction.upsert({
                    where: {
                        messageId_userId_emoji: {
                            messageId,
                            userId: socket.user.id,
                            emoji
                        }
                    },
                    create: { messageId, userId: socket.user.id, emoji },
                    update: {},
                    include: { user: { select: { id: true, username: true } } }
                })

                const recipientId = message.conversation.participant1Id === socket.user.id
                    ? message.conversation.participant2Id
                    : message.conversation.participant1Id

                const reactionData = { messageId, reaction }
                io.to(recipientId).emit('message:reacted', reactionData)
                callback({ success: true, ...reactionData })
            } catch (err) {
                console.error(err)
                callback({ error: 'Failed to react' })
            }
        })

        // remove reaction
        socket.on('message:unreact', async (data, callback) => {
            const { messageId, emoji } = data

            try {
                const message = await prisma.message.findUnique({
                    where: { id: messageId },
                    include: { conversation: true }
                })

                if (!message) return callback({ error: 'Message not found' })

                await prisma.reaction.delete({
                    where: {
                        messageId_userId_emoji: {
                            messageId,
                            userId: socket.user.id,
                            emoji
                        }
                    }
                })

                const recipientId = message.conversation.participant1Id === socket.user.id
                    ? message.conversation.participant2Id
                    : message.conversation.participant1Id

                const unreactData = { messageId, userId: socket.user.id, emoji }
                io.to(recipientId).emit('message:unreacted', unreactData)
                callback({ success: true, ...unreactData })
            } catch (err) {
                console.error(err)
                callback({ error: 'Failed to remove reaction' })
            }
        })

        // file message notification
        socket.on('file:sent', async (data) => {
            const { message, conversationId } = data

            try {
                const conversation = await prisma.conversation.findFirst({
                    where: { id: conversationId }
                })
                if (!conversation) return

                const recipientId = conversation.participant1Id === socket.user.id
                    ? conversation.participant2Id
                    : conversation.participant1Id

                io.to(recipientId).emit('message:receive', message)
            } catch (err) {
                console.error(err)
            }
        })

        // typing indicators
        socket.on('typing:start', (data) => {
            const { conversationId, recipientId } = data
            io.to(recipientId).emit('typing:start', {
                userId: socket.user.id,
                username: socket.user.username,
                conversationId
            })
        })

        socket.on('typing:stop', (data) => {
            const { recipientId } = data
            io.to(recipientId).emit('typing:stop', {
                userId: socket.user.id
            })
        })

        // message delivered (recipient received it)
        socket.on('message:delivered', async (data) => {
            const { messageId, senderId } = data

            try {
                await prisma.message.update({
                    where: { id: messageId },
                    data: { deliveredAt: new Date() }
                })
                io.to(senderId).emit('message:delivered', { messageId })
            } catch (err) {
                console.error(err)
            }
        })

        // message seen
        socket.on('message:seen', async (data) => {
            const { messageId, senderId } = data

            try {
                await prisma.message.update({
                    where: { id: messageId },
                    data: { seenAt: new Date() }
                })
                io.to(senderId).emit('message:seen', { messageId })
            } catch (err) {
                console.error(err)
            }
        })

        // disconnect
        socket.on('disconnect', () => {
            console.log(`${socket.user.username} disconnected`)

            prisma.user.update({
                where: { id: socket.user.id },
                data: { isOnline: false, lastSeenAt: new Date() }
            }).then(() => {
                io.emit('presence:update', {
                    userId: socket.user.id,
                    isOnline: false,
                    lastSeenAt: new Date()
                })
            })
        })
    })
}