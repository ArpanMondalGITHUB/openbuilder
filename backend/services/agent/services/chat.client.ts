import axios from "axios"
import { config } from "../config/agent.config"


export const fetchMessages = async (conversationId:string,userId:string) => {
    try {
        const { data } = await axios.get<{ messages?: any[] }>(
            `${config.chatUrl}/api/v1/chat/conversations/${conversationId}/messages`,
            {
                headers: { "x-internal-key":config.internalKey, "x-user-id": userId},
                timeout: 10_000
            }
        )
        return (data.messages ?? [])
            .filter((m:any)=>m.status == "complete")
            .map((m:any)=>({role:m.role,content:m.content,requestId:m.request_id ?? undefined}))
    } catch (error) {
        console.error("fetch message failed",error)
        throw error
    }
}