const express = require('express')
const prisma = require('../models/prisma')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

// all routes here are protected
router.use(authMiddleware)

// get or create a conversation with another user
router.post('/', async (req, res) => {
    const { userId } = req.body
    const myId = req.user.id

    if (userId === myId) {
        return res.status(400).json({ error: 'Cannot create conversation with yourself' })
    }

    try {
        // check if conversation already exists between these two users
        let conversation = await prisma.conversation.findFirst({
            where: {
                OR: [
                    { participant1Id: myId, participant2Id: userId },
                    { participant1Id: userId, participant2Id: myId }
                ]
            },
            include: {
                participant1: { select: { id: true, username: true, avatarUrl: true, isOnline: true } },
                participant2: { select: { id: true, username: true, avatarUrl: true, isOnline: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        })

        // if not create it
        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    participant1Id: myId,
                    participant2Id: userId
                },
                include: {
                    participant1: { select: { id: true, username: true, avatarUrl: true, isOnline: true } },
                    participant2: { select: { id: true, username: true, avatarUrl: true, isOnline: true } },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                }
            })
        }

        res.json(conversation)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Something went wrong' })
    }
})

// get all conversations for current user
router.get('/', async (req, res) => {
    try {
        const conversations = await prisma.conversation.findMany({
            where: {
                OR: [
                    { participant1Id: req.user.id },
                    { participant2Id: req.user.id }
                ]
            },
            include: {
                participant1: { select: { id: true, username: true, avatarUrl: true, isOnline: true } },
                participant2: { select: { id: true, username: true, avatarUrl: true, isOnline: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        res.json(conversations)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Something went wrong' })
    }
})

// get all messages in a conversation
router.get('/:id/messages', async (req, res) => {
    try {
        // verify user is part of this conversation
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: req.params.id,
                OR: [
                    { participant1Id: req.user.id },
                    { participant2Id: req.user.id }
                ]
            }
        })

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' })
        }

        const messages = await prisma.message.findMany({
            where: { conversationId: req.params.id },
            include: {
                sender: { select: { id: true, username: true, avatarUrl: true } }
            },
            orderBy: { createdAt: 'asc' }
        })

        res.json(messages)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Something went wrong' })
    }
})

module.exports = router