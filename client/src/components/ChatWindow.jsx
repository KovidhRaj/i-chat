import { useEffect, useRef, useState } from 'react'
import useChatStore from '../store/ChatStore'
import useAuthStore from '../store/authStore'
import { useSocket } from '../context/SocketContext'
import api from '../lib/axios'
import Avatar from './Avatar'

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥']

const ChatWindow = () => {
    const {
        activeConversation, messages, setMessages, addMessage,
        setActiveConversation, deleteMessage, addReaction,
        removeReaction, updateMessageStatus, replyingTo, setReplyingTo
    } = useChatStore()
    const { user } = useAuthStore()
    const socket = useSocket()
    const fileInputRef = useRef(null)
    const inputRef = useRef(null)
    const [uploading, setUploading] = useState(false)
    const [input, setInput] = useState('')
    const [typing, setTyping] = useState(false)
    const [isTyping, setIsTyping] = useState(false)
    const [lightboxUrl, setLightboxUrl] = useState(null)
    const [activeMenu, setActiveMenu] = useState(null)
    const [showReactions, setShowReactions] = useState(null)
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

    const formatLastSeen = (date) => {
        if (!date) return 'Offline'
        const diff = Date.now() - new Date(date).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'Active just now'
        if (mins < 60) return `Active ${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `Active ${hrs}h ago`
        return `Active ${Math.floor(hrs / 24)}d ago`
    }

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

    // listen for socket events
    useEffect(() => {
        if (!socket) return

        socket.on('message:receive', (message) => {
            if (message.conversationId === activeConversation?.id) {
                addMessage(message)
                socket.emit('message:delivered', {
                    messageId: message.id,
                    senderId: message.senderId
                })
                socket.emit('message:seen', {
                    messageId: message.id,
                    senderId: message.senderId
                })
            }
        })

        socket.on('message:deleted', ({ messageId }) => {
            deleteMessage(messageId)
        })

        socket.on('message:reacted', ({ messageId, reaction }) => {
            addReaction(messageId, reaction)
        })

        socket.on('message:unreacted', ({ messageId, userId, emoji }) => {
            removeReaction(messageId, userId, emoji)
        })

        socket.on('message:delivered', ({ messageId }) => {
            updateMessageStatus(messageId, 'deliveredAt')
        })

        socket.on('message:seen', ({ messageId }) => {
            updateMessageStatus(messageId, 'seenAt')
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
            socket.off('message:deleted')
            socket.off('message:reacted')
            socket.off('message:unreacted')
            socket.off('message:delivered')
            socket.off('message:seen')
            socket.off('typing:start')
            socket.off('typing:stop')
        }
    }, [socket, activeConversation])

    // close menus on click outside
    useEffect(() => {
        const handler = () => { setActiveMenu(null); setShowReactions(null) }
        document.addEventListener('click', handler)
        return () => document.removeEventListener('click', handler)
    }, [])

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
            content: input.trim(),
            replyToId: replyingTo?.id || null
        }, (response) => {
            if (response.message) {
                addMessage(response.message)
            }
        })

        setInput('')
        setReplyingTo(null)
        setTyping(false)
        clearTimeout(typingTimeout.current)
        socket.emit('typing:stop', { recipientId: otherUser.id })
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
        if (e.key === 'Escape' && replyingTo) {
            setReplyingTo(null)
        }
    }

    const handleDelete = (messageId) => {
        socket.emit('message:delete', { messageId }, (response) => {
            if (response.success) {
                deleteMessage(messageId)
            }
        })
        setActiveMenu(null)
    }

    const handleReact = (messageId, emoji) => {
        socket.emit('message:react', { messageId, emoji }, (response) => {
            if (response.success) {
                addReaction(messageId, response.reaction)
            }
        })
        setShowReactions(null)
    }

    const handleUnreact = (messageId, emoji) => {
        socket.emit('message:unreact', { messageId, emoji }, (response) => {
            if (response.success) {
                removeReaction(messageId, user.id, emoji)
            }
        })
    }

    const handleReply = (msg) => {
        setReplyingTo(msg)
        setActiveMenu(null)
        inputRef.current?.focus()
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

    const renderStatus = (msg) => {
        if (msg.senderId !== user.id) return null
        if (msg.seenAt) return <span className="seen-tick seen"> ✓✓</span>
        if (msg.deliveredAt) return <span className="seen-tick delivered"> ✓✓</span>
        return <span className="seen-tick sent"> ✓</span>
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
                <button
                    className="back-btn"
                    onClick={() => setActiveConversation(null)}
                    aria-label="Back to conversations"
                >
                    ←
                </button>
                <Avatar user={otherUser} />
                <div>
                    <p className="chat-header-name">{otherUser?.displayName || otherUser?.username}</p>
                    <p className="chat-header-status">
                        {otherUser?.isOnline ? 'Online' : formatLastSeen(otherUser?.lastSeenAt)}
                    </p>
                </div>
            </div>

            <div className="messages-list">
                {messages.map((msg, index) => {
                    const prevMsg = messages[index - 1]
                    const isGrouped = !!prevMsg &&
                        prevMsg.senderId === msg.senderId &&
                        (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) < 5 * 60 * 1000
                    const isMine = msg.senderId === user.id
                    const isDeleted = !!msg.deletedAt

                    return (
                        <div
                            key={msg.id}
                            className={`message ${isMine ? 'mine' : 'theirs'} ${isGrouped ? 'grouped' : ''}`}
                        >
                            {/* replied-to preview */}
                            {msg.replyTo && !isDeleted && (
                                <div className="reply-preview">
                                    <span className="reply-author">{msg.replyTo.sender?.username}</span>
                                    <span className="reply-text">
                                        {msg.replyTo.deletedAt
                                            ? 'Message deleted'
                                            : msg.replyTo.content || '📎 File'}
                                    </span>
                                </div>
                            )}

                            <div className="message-bubble">
                                {isDeleted ? (
                                    <p className="deleted-text">This message was deleted</p>
                                ) : (
                                    <>
                                        {msg.content && <p>{msg.content}</p>}
                                        {msg.fileUrl && (
                                            isImage(msg.fileUrl)
                                                ? <img src={msg.fileUrl} alt='sent file' className='message-image' />
                                                : <a href={msg.fileUrl} target='_blank' rel='noreferrer' className='file-link'>📄 Download file</a>
                                        )}
                                    </>
                                )}

                                {/* hover actions */}
                                {!isDeleted && (
                                    <div className="message-actions" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            className="msg-action-btn"
                                            onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                                            title="React"
                                        >😊</button>
                                        <button
                                            className="msg-action-btn"
                                            onClick={() => handleReply(msg)}
                                            title="Reply"
                                        >↩</button>
                                        {isMine && (
                                            <button
                                                className="msg-action-btn"
                                                onClick={() => handleDelete(msg.id)}
                                                title="Delete"
                                            >🗑</button>
                                        )}
                                    </div>
                                )}

                                {/* emoji picker */}
                                {showReactions === msg.id && (
                                    <div className="reaction-picker" onClick={(e) => e.stopPropagation()}>
                                        {QUICK_EMOJIS.map(emoji => (
                                            <button
                                                key={emoji}
                                                className="reaction-emoji"
                                                onClick={() => handleReact(msg.id, emoji)}
                                            >{emoji}</button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* reactions display */}
                            {msg.reactions && msg.reactions.length > 0 && (
                                <div className="reactions-row">
                                    {Object.entries(
                                        msg.reactions.reduce((acc, r) => {
                                            acc[r.emoji] = acc[r.emoji] || { emoji: r.emoji, users: [] }
                                            acc[r.emoji].users.push(r.user)
                                            return acc
                                        }, {})
                                    ).map(([emoji, data]) => (
                                        <button
                                            key={emoji}
                                            className={`reaction-badge ${data.users.some(u => u.id === user.id) ? 'mine' : ''}`}
                                            onClick={() =>
                                                data.users.some(u => u.id === user.id)
                                                    ? handleUnreact(msg.id, emoji)
                                                    : handleReact(msg.id, emoji)
                                            }
                                        >
                                            {emoji} {data.users.length > 1 ? data.users.length : ''}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="message-time">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                                {renderStatus(msg)}
                            </div>
                        </div>
                    )
                })}

                {isTyping && (
                    <div className="message theirs">
                        <div className="message-bubble typing-indicator">
                            <span /><span /><span />
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* reply banner */}
            {replyingTo && (
                <div className="reply-banner">
                    <div className="reply-banner-content">
                        <span className="reply-banner-author">{replyingTo.sender?.username || 'You'}</span>
                        <span className="reply-banner-text">
                            {replyingTo.content || '📎 File'}
                        </span>
                    </div>
                    <button className="reply-banner-close" onClick={() => setReplyingTo(null)}>✕</button>
                </div>
            )}

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
                    ref={inputRef}
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