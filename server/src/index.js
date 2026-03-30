const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
const httpServer = http.createServer(app)

const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ['GET', 'POST']
    }
})

//Middleware

app.use(cors({ origin: process.env.CLIENT_URL }))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Routes
const authRoutes = require('./routes/auth')
const conversationRoutes = require('./routes/conversation')
const userRoutes = require('./routes/users')
const uploadRoutes = require('./routes/upload')

app.use('/api/auth', authRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/users', userRoutes)
app.use('/api/upload', uploadRoutes)

app.get('/', (req, res) => {
    res.json({ message: 'Chat App is running' })
})

// Socket
const socketHandler = require('./socket')
socketHandler(io)

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`)

})