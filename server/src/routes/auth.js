const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const prisma = require('../models/prisma')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

//register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' })

    }

    try {
        //check if user already exist
        const existing = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        })

        if (existing) {
            return res.status(400).json({ error: 'Username or email already taken' })
        }

        // hash the password
        const passwordHash = await bcrypt.hash(password, 10)

        // create user
        const user = await prisma.user.create({
            data: { username, email, passwordHash }
        })
        // generate token
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.status(201).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Something went wrong' })
    }
})

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ error: 'All fields are required' })
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' })
        }

        //check password
        const valid = await bcrypt.compare(password, user.passwordHash)

        if (!valid) {
            return res.status(400).json({ error: 'Invalid credentials' })
        }

        //generate token
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.json({
            token,
            user: {
                id: user.id,
                usename: user.username,
                email: user.email
            }
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Something went wrong' })
    }
})

// get current user (protected route)
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, username: true, email: true, avatarUrl: true }
        })
        res.json(user)
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong' })
    }
})

module.exports = router