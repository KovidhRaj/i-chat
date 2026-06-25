import { useEffect, useState } from 'react'
import useAuthStore from '../store/authStore'
import useChatStore from '../store/ChatStore'
import api from '../lib/axios'
import Avatar from './Avatar'
import ProfileModal from './ProfileModal'

const Sidebar = () => {
    const { user, logout } = useAuthStore()
    const { conversations, setConversations, setActiveConversation, activeConversation, addConversation } = useChatStore()
    const [search, setSearch] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [showProfile, setShowProfile] = useState(false)

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await api.get('/conversations')
                setConversations(res.data)
            } catch (err) {
                console.error(err)
            }
        }
        fetchConversations()
    }, [])

    useEffect(() => {
        if (!search.trim()) {
            setSearchResults([])
            return
        }

        const timeout = setTimeout(async () => {
            setSearching(true)
            try {
                const res = await api.get(`/users/search?q=${search}`)
                setSearchResults(res.data)
            } catch (err) {
                console.error(err)
            } finally {
                setSearching(false)
            }
        }, 400)

        return () => clearTimeout(timeout)
    }, [search])

    const startConversation = async (userId) => {
        try {
            const res = await api.post('/conversations', { userId })
            addConversation(res.data)
            setActiveConversation(res.data)
            setSearch('')
            setSearchResults([])
        } catch (err) {
            console.error(err)
        }
    }

    const getOtherUser = (conversation) => {
        if (!conversation?.participant1 || !conversation?.participant2) return null
        return conversation.participant1.id === user?.id
            ? conversation.participant2
            : conversation.participant1
    }

    const getLastMessage = (conversation) => {
        if (!conversation?.messages?.length) return 'No messages yet'
        return conversation.messages[0]?.content || 'Sent a file'
    }

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-user" onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
                    <Avatar user={user} />
                    <div>
                        <span className="sidebar-username">{user?.displayName || user?.username}</span>
                        {user?.displayName && <span className="sidebar-handle">@{user?.username}</span>}
                    </div>
                </div>
                <button className="logout-btn" onClick={logout}>Sign out</button>
            </div>

            <div className="search-box">
                <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {search && (
                <div className="search-results">
                    {searching && <p className="search-hint">Searching...</p>}
                    {!searching && searchResults.length === 0 && (
                        <p className="search-hint">No users found</p>
                    )}
                    {searchResults.map(u => (
                        <div
                            key={u.id}
                            className="search-result-item"
                            onClick={() => startConversation(u.id)}
                        >
                            <Avatar user={u} size="small" />
                            <div>
                                <p className="result-name">{u.displayName || u.username}</p>
                                <p className="result-sub">@{u.username}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!search && (
                <div className="conversation-list">
                    {(conversations.length === 0) && (
                        <p className="search-hint">No conversations yet. Search for a user to start!</p>
                    )}
                    {(conversations || []).map(conv => {
                        const other = getOtherUser(conv)
                        if (!other) return null
                        return (
                            <div
                                key={conv.id}
                                className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                                onClick={() => setActiveConversation(conv)}
                            >
                                <div className="avatar-wrapper">
                                    <Avatar user={other} />
                                    {other?.isOnline && <span className="online-dot" />}
                                </div>
                                <div className="conv-info">
                                    <p className="conv-name">{other?.displayName || other?.username}</p>
                                    <p className="conv-last">{getLastMessage(conv)}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
        </div>
    )
}

export default Sidebar