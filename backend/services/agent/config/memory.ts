import { redisGet, redisSet } from "../../../shared/redis/redis"
import { fetchMessages } from "../services/chat.client"
import type { ChatTurn } from "../models/agent.zod_models"

const MAX_MESSAGES = 20
const TTL_SECONDS = 60 * 60 * 24

const key = (conversationId: string) => `memory:${conversationId}`

const isChatTurn = (m: any): m is ChatTurn =>
    (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string"

const readCache = async (conversationId: string): Promise<ChatTurn[] | null> => {
    const raw = await redisGet(key(conversationId))
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.filter(isChatTurn) : null
    } catch {
        return null
    }
}

const writeCache = (conversationId: string, turns: ChatTurn[]) =>
    redisSet(key(conversationId), JSON.stringify(turns.slice(-MAX_MESSAGES)), TTL_SECONDS)

// Recent turns for a conversation. Redis first; on a miss (expired, evicted, or
// Redis down) rebuild from the chat service, which owns the messages table.
export const getMemory = async (conversationId: string, userId: string): Promise<ChatTurn[]> => {
    const cached = await readCache(conversationId)
    if (cached) return cached

    // only "complete" messages come back, so the pending prompt being answered
    // right now is not included and the agent won't see it twice
    const messages: ChatTurn[] = (await fetchMessages(conversationId, userId)).filter(isChatTurn)
    const recent = messages.slice(-MAX_MESSAGES)
    if (recent.length) await writeCache(conversationId, recent)
    return recent
}

// Append new turns and keep only the last MAX_MESSAGES. Resets the TTL.
export const addToMemory = async (conversationId: string, turns: ChatTurn[]): Promise<void> => {
    const existing = (await readCache(conversationId)) ?? []
    await writeCache(conversationId, [...existing, ...turns])
}
