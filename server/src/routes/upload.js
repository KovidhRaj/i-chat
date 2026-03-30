const express = require('express')
const path = require('path')
const authMiddleware = require('../middleware/auth')
const upload = require('../middleware/upload')
const prisma = require('../models/prisma')

const router = express.Router()

router.use(authMiddleware)

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' })
        }
        const { conversationId } = req.body

        if (!conversationId) {
            return res.status(400).json({ error: 'Conversation ID required' })
        }
        // verify user is part of the conversation
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                OR: [
                    { participant1Id: req.user.id },
                    { participant2Id: req.user.id }
                ]
            }
        })
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' })
        }
        // build the public URL for the file
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
        // save message with file URL to the database
        const message = await prisma.message.create({
            data: {
                fileUrl,
                conversationId,
                senderId: req.user.id
            },
            include: {
                sender: {
                    select: { id: true, username: true, avatarUrl: true }
                }
            }
        })
        res.status(201).json({ message: fileUrl })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err.message || 'Upload failed' })
    }
})
module.exports = router