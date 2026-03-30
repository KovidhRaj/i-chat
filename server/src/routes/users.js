const express = require('express')
const prisma = require('../models/prisma')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)

// search users by username
router.get('/search', async (req, res) => {
    const { q } = req.query

    if (!q) {
        return res.status(400).json({ error: 'Serach query required' })
    }
    try {
        const users = await prisma.user.findMany({
            where: {
                username: { contains: q },
                NOT: { id: req.user.id } // exclude yourself
            },
            select: { id: true, username: true, avatarUrl: true, isOnline: true },
            take: 10
        })

        res.json(users)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Something went wrong' })
    }
})
module.exports = router