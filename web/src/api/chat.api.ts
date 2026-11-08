import axiosInstance from "./axios.config"

export interface Conversation {
    id: string
    user_id: string
    title: string
    created_at: string
}

export type MessageStatus = "pending" | "complete" | "failed" | "cancelled"

export interface Message {
    id: string
    conversation_id: string
    role: "user" | "assistant"
    content: string
    created_at: string
    // the user message and the assistant reply to it share one request_id
    request_id: string | null
    status: MessageStatus
}

export interface SendMessageResponse {
    userMessage: Message
    assistantMessage?: Message | null
    status: MessageStatus
    requestId: string
}

const chatApi = {
    listConversations: async (): Promise<Conversation[]> => {
        const { data } = await axiosInstance.get<{ conversations: Conversation[] }>("/api/v1/chat/conversations")
        return data.conversations
    },

    createConversation: async (title: string): Promise<Conversation> => {
        const { data } = await axiosInstance.post<{ conversation: Conversation }>("/api/v1/chat/conversations", { title })
        return data.conversation
    },

    getMessages: async (conversationId: string): Promise<Message[]> => {
        const { data } = await axiosInstance.get<{ messages: Message[] }>(
            `/api/v1/chat/conversations/${conversationId}/messages`
        )
        return data.messages
    },

    // requestId doubles as the Idempotency-Key: resending with the same one never
    // duplicates the message, and on a failed attempt it makes the backend rerun the agent
    sendMessage: async (
        conversationId: string,
        content: string,
        requestId: string,
        signal?: AbortSignal
    ): Promise<SendMessageResponse> => {
        const { data } = await axiosInstance.post<SendMessageResponse>(
            `/api/v1/chat/conversations/${conversationId}/messages`,
            { content },
            { headers: { "Idempotency-Key": requestId }, signal }
        )
        return data
    },

    // Stop button: marks the attempt cancelled server-side and aborts the agent run
    cancelMessage: async (conversationId: string, requestId: string) => {
        await axiosInstance.post(`/api/v1/chat/conversations/${conversationId}/messages/${requestId}/cancel`, {})
    },
}

export default chatApi
