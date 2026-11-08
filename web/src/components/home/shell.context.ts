import { useOutletContext } from "react-router-dom"
import type { User } from "../../types/user"
import type { Conversation } from "../../api/chat.api"

export interface ShellContext {
    user: User | null
    conversations: Conversation[]
    loadingConversations: boolean
    addConversation: (c: Conversation) => void
}

export const useShell = () => useOutletContext<ShellContext>()
