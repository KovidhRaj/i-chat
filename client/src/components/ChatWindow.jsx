import { useEffect, useRef, useState } from 'react'
import useChatStore from '../store/ChatStore'
import useAuthStore from '../store/authStore'
import { useSocket } from '../context/SocketContext'
import api from '../lib/axios'

const ChatWindow = () => {
    const { activeConversation, messages, setMessages, addMessage } = useChatStore()
    const { user } = useAuthStore()
    const socket = useSocket()
    const fileInputRef = useRef(null)
    const [uploading, setUploading] = useState(false)
    const [input, setInput] = useState('')
    const [typing, setTyping] = useState(false)
    const [isTyping, setIsTyping] = useState(false)
    const typingTimeout = useRef(null)
    const bottomRef = useRef(null)

    const getOtherUser = () => {
        if (!activeConversation || !user) return null
        return activeConversation.participant1.id === user?.id
            ? activeConversation.participant2
            : activeConversation.participant1
    }

    const otherUser = getOtherUser()

    const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url)

    // fetch messages when conversation changes
    useEffect(() => {
        if (!activeConversation) return

        const fetchMessages = async () => {
            try {
                const res = await api.get(`/conversations/${activeConversation.id}/messages`)
                setMessages(res.data)
            } catch (err) {
                console.error(err)
            }
        }
        fetchMessages()
    }, [activeConversation])

    // scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // listen for incoming messages and typing
    useEffect(() => {
        if (!socket) return

        socket.on('message:receive', (message) => {
            if (message.conversationId === activeConversation?.id) {
                addMessage(message)
                // mark as seen
                socket.emit('message:seen', {
                    messageId: message.id,
                    senderId: message.senderId
                })
            }
        })

        socket.on('typing:start', (data) => {
            if (data.conversationId === activeConversation?.id) {
                setIsTyping(true)
            }
        })

        socket.on('typing:stop', () => {
            setIsTyping(false)
        })

        return () => {
            socket.off('message:receive')
            socket.off('typing:start')
            socket.off('typing:stop')
        }
    }, [socket, activeConversation])

    const handleTyping = (e) => {
        setInput(e.target.value)

        if (!socket || !otherUser) return

        if (!typing) {
            setTyping(true)
            socket.emit('typing:start', {
                conversationId: activeConversation.id,
                recipientId: otherUser.id
            })
        }

        clearTimeout(typingTimeout.current)
        typingTimeout.current = setTimeout(() => {
            setTyping(false)
            socket.emit('typing:stop', { recipientId: otherUser.id })
        }, 1500)
    }

    const sendMessage = () => {
        if (!input.trim() || !socket) return

        socket.emit('message:send', {
            conversationId: activeConversation.id,
            content: input.trim()
        }, (response) => {
            if (response.message) {
                addMessage(response.message)
            }
        })

        setInput('')
        setTyping(false)
        clearTimeout(typingTimeout.current)
        socket.emit('typing:stop', { recipientId: otherUser.id })
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const sendFile = async (e) => {
        const file = e.target.files[0]
        if (!file || !activeConversation) return

        setUploading(true)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('conversationId', activeConversation.id)

        try {
            const res = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            const { message } = res.data

            addMessage(message)

            socket.emit('file:sent', {
                message,
                conversationId: activeConversation.id
            })
        } catch (err) {
            console.error('Upload failed:', err)
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    if (!activeConversation) {
        return (
            <div className="chat-empty">
                <div className="chat-empty-inner">
                    <h2>Select a conversation</h2>
                    <p>Search for a user in the sidebar to start chatting</p>
                </div>
            </div>
        )
    }

    return (
        <div className="chat-window">
            <div className="chat-header">
                <div className="avatar">{otherUser?.username[0].toUpperCase()}</div>
                <div>
                    <p className="chat-header-name">{otherUser?.username}</p>
                    <p className="chat-header-status">
                        {otherUser?.isOnline ? 'Online' : 'Offline'}
                    </p>
                </div>
            </div>

            <div className="messages-list">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`message ${msg.senderId === user.id ? 'mine' : 'theirs'}`}
                    >
                        <div className="message-bubble">{msg.content && <p>{msg.content}</p>}
                            {msg.fileUrl && (
                                isImage(msg.fileUrl)
                                    ? <img src={msg.fileUrl} alt='sent file' className='message-image' />
                                    : <a href={msg.fileUrl} target='_blank' rel='noreferrer' className='file-link'>📄 Download file</a>
                            )}</div>
                        <div className="message-time">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                            {msg.senderId === user.id && msg.seenAt && (
                                <span className="seen-tick"> ✓✓</span>
                            )}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="message theirs">
                        <div className="message-bubble typing-indicator">
                            <span /><span /><span />
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            <div className="chat-input-bar">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={sendFile}
                    style={{ display: 'none' }}
                    accept="image/*,.pdf,.txt,.doc,.docx"

                />
                <button
                    className="attach-btn"
                    onClick={() => fileInputRef.current.click()}
                    disabled={uploading}
                >
                    {uploading ? '...' : '📎'}
                </button>
                <input
                    type='text'
                    placeholder='Type a message...'
                    value={input}
                    onChange={handleTyping}
                    onKeyDown={handleKeyDown}
                />
                <button onClick={sendMessage} disabled={!input.trim()}>
                    Send
                </button>
            </div>
        </div>
    )
}

export default ChatWindow