const prisma = require('../models/prisma')
const jwt = require('jsonwebtoken')

module.exports = (io) => {
    // authenticate socket connection using JWT
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

        // join a personal room using user id
        // this lets us send messages directly to specific user
        socket.join(socket.user.id)

        //update user online status
        prisma.user.update({
            where: { id: socket.user.id },
            data: { isOnline: true }
        }).then(() => {
            // broadcast to everyon that this user is online
            io.emit('presence:update', {
                userId: socket.user.id,
                isOnline: true
            })
        })
        // handle sending a message
        socket.on('message:send', async (data, callback) => {
            const { conversationId, content } = data

            try {
                //verify this user is part of the conversation
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
                // save message to database
                const message = await prisma.message.create({
                    data: {
                        content,
                        conversationId,
                        senderId: socket.user.id
                    },
                    include: {
                        sender: {
                            select: { id: true, username: true, avatarUrl: true }
                        }
                    }
                })
                // find the other participant
                const recipientId = conversation.participant1Id === socket.user.id
                    ? conversation.participant2Id
                    : conversation.participant1Id

                // send message to recipient's personal room
                io.to(recipientId).emit('message:receive', message)

                // send back to sender as confirmation
                callback({ message })
            } catch (err) {
                console.error(err)
                callback({ error: 'Failed to send message' })
            }
        })
        // handle file message notification
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

                // notify recipient about the file message
                io.to(recipientId).emit('message:receive', message)
            } catch (err) {
                console.error(err)
            }

        })
        // handle typing indicator
        socket.on('typing:start', (data) => {
            const { conversationId, recipientId } = data
            io.to(recipientId).emit('typing:start', {
                userId: socket.user.id,
                username: socket.user.username,
                conversationId
            })
        })

        socket.on('typing: stop', (data) => {
            const { recipientId } = data
            io.to(recipientId).emit('typing:stop', {
                userId: socket.user.id
            })
        })

        // handle message seen

        socket.on('message:seen', async (data) => {
            const { message, senderId } = data

            try {
                await prisma.message.update({
                    where: { id: messageId },
                    data: { seenAt: new Date() }
                })

                // notify the sender their message was seen
                io.to(senderId).emit('message:seen', { messageId })
            } catch (err) {
                console.error(err)
            }
        })

        //handle disconnect
        socket.on('disconnect', () => {
            console.log(`${socket.user.username} disconnected`)

            prisma.user.update({
                where: { id: socket.user.id },
                data: { isOnline: false }
            }).then(() => {
                io.emit('presence:update', {
                    userId: socket.user.id,
                    isOnline: false
                })
            })
        })

    })
}