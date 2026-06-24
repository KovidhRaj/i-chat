const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const { createAdapter } = require('@socket.io/redis-adapter')
const { createClient } = require('redis')
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

// Connect the Redis adapter before accepting any connections, so that
// every instance shares presence/typing/message events from the start
// instead of only seeing sockets connected to itself.
const pubClient = createClient({ url: process.env.REDIS_URL })
const subClient = pubClient.duplicate()

Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
        io.adapter(createAdapter(pubClient, subClient))
        httpServer.listen(PORT, () => {
            console.log(`Server running on port: ${PORT} (Redis adapter connected)`)
        })
    })
    .catch((err) => {
        console.error('Failed to connect Redis adapter:', err)
        process.exit(1)
    })