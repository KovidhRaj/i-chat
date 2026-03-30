import { create } from 'zustand'

const useChatStore = create((set) => ({
    conversations: [],
    activeConversation: null,
    messages: [],

    setConversations: (conversations) => set({ conversations }),

    addConversation: (conversation) => set((state) => ({
        conversations: [conversation, ...state.conversations.filter(c => c.id !== conversation.id)]
    })),

    setActiveConversation: (conversation) => set({
        activeConversation: conversation,
        messages: []
    }),

    setMessages: (messages) => set({ messages }),

    addMessage: (message) => set((state) => ({
        messages: [...state.messages, message],
        conversations: state.conversations.map(c =>
            c.id === message.conversationId
                ? { ...c, messages: [message] }
                : c
        )
    }))
}))

export default useChatStore