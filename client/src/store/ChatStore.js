import { create } from 'zustand'

const useChatStore = create((set) => ({
    conversations: [],
    activeConversation: null,
    messages: [],
    replyingTo: null,

    setConversations: (conversations) => set({ conversations }),

    addConversation: (conversation) => set((state) => ({
        conversations: [conversation, ...state.conversations.filter(c => c.id !== conversation.id)]
    })),

    setActiveConversation: (conversation) => set({
        activeConversation: conversation,
        messages: [],
        replyingTo: null
    }),

    setMessages: (messages) => set({ messages }),

    addMessage: (message) => set((state) => ({
        messages: [...state.messages, message],
        conversations: state.conversations.map(c =>
            c.id === message.conversationId
                ? { ...c, messages: [message] }
                : c
        )
    })),

    deleteMessage: (messageId) => set((state) => ({
        messages: state.messages.map(m =>
            m.id === messageId
                ? { ...m, deletedAt: new Date().toISOString(), content: null, fileUrl: null }
                : m
        )
    })),

    addReaction: (messageId, reaction) => set((state) => ({
        messages: state.messages.map(m =>
            m.id === messageId
                ? { ...m, reactions: [...(m.reactions || []).filter(r => !(r.userId === reaction.user.id && r.emoji === reaction.emoji)), reaction] }
                : m
        )
    })),

    removeReaction: (messageId, userId, emoji) => set((state) => ({
        messages: state.messages.map(m =>
            m.id === messageId
                ? { ...m, reactions: (m.reactions || []).filter(r => !(r.user.id === userId && r.emoji === emoji)) }
                : m
        )
    })),

    updateMessageStatus: (messageId, field) => set((state) => ({
        messages: state.messages.map(m =>
            m.id === messageId
                ? { ...m, [field]: new Date().toISOString() }
                : m
        )
    })),

    setReplyingTo: (message) => set({ replyingTo: message })
}))

export default useChatStore