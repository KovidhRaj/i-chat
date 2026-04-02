import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import useAuthStore from '../store/authStore'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null)
    const token = useAuthStore((state) => state.token)

    useEffect(() => {
        if (!token) return

        const newSocket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
            auth: { token }
        })

        newSocket.on('connect', () => {
            console.log('Socket connected')
        })

        newSocket.on('connect_error', (err) => {
            console.error('Socket error:', err.message)
        })

        setSocket(newSocket)

        return () => {
            newSocket.disconnect()
        }
    }, [token])

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    )
}

export const useSocket = () => useContext(SocketContext)