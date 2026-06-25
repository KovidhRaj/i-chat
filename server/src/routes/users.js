const express = require('express')
const prisma = require('../models/prisma')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)

// search users by username
router.get('/search', async (req, res) => {
    const { q } = req.query

    if (!q) {
        return res.status(400).json({ error: 'Search query required' })
    }
    try {
        const users = await prisma.user.findMany({
            where: {
                username: { contains: q },
                NOT: { id: req.user.id }
            },
            select: { id: true, username: true, avatarUrl: true, displayName: true, isOnline: true },
            take: 10
        })

        res.json(users)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Something went wrong' })
    }
})

// update profile
router.put('/profile', async (req, res) => {
    const { displayName, bio, avatarUrl } = req.body

    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                displayName: displayName || null,
                bio: bio || null,
                avatarUrl: avatarUrl || null
            },
            select: { id: true, username: true, email: true, avatarUrl: true, displayName: true, bio: true }
        })

        res.json(user)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Failed to update profile' })
    }
})
module.exports = router