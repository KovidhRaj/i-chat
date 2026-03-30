import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import { useSocket } from '../context/SocketContext'
import useChatStore from '../store/ChatStore'
import useAuthStore from '../store/authStore'
import { useEffect } from 'react'

const Home = () => {
    const socket = useSocket()
    const { addMessage, conversations, setConversations } = useChatStore()
    const { user } = useAuthStore()

    useEffect(() => {
        if (!socket) return

        // handle incoming messages when no conversation is active
        socket.on('message:receive', (message) => {
            addMessage(message)
        })

        // handle presence updates
        socket.on('presence:update', ({ userId, isOnline }) => {
            setConversations(
                conversations.map(conv => ({
                    ...conv,
                    participant1: conv.participant1.id === userId
                        ? { ...conv.participant1, isOnline }
                        : conv.participant1,
                    participant2: conv.participant2.id === userId
                        ? { ...conv.participant2, isOnline }
                        : conv.participant2
                }))
            )
        })

        return () => {
            socket.off('message:receive')
            socket.off('presence:update')
        }
    }, [socket, conversations])

    return (
        <div className="app-layout">
            <Sidebar />
            <ChatWindow />
        </div>
    )
}

export default Home