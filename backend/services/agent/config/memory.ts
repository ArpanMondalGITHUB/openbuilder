import redis, { redisGet } from "../../../shared/redis/redis"
import { fetchMessages } from "../services/chat.client"
import type { ChatTurn } from "../models/agent.zod_models"

const MAX_MESSAGES = 20
const TTL_SECONDS = 60 * 60 * 24

const key = (conversationId: string) => `memory:${conversationId}`

// what Redis holds: a turn plus the request that produced it, used to skip
// re-appending the same pair when a request is retried
type StoredTurn = ChatTurn & { requestId?: string }

const toChatTurn = ({ role, content }: StoredTurn): ChatTurn => ({ role, content })

const isChatTurn = (m: any): m is ChatTurn =>
    (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string"

const readCache = async (conversationId: string): Promise<StoredTurn[] | null> => {
    const raw = await redisGet(key(conversationId))
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.filter(isChatTurn) : null
    } catch {
        return null
    }
}

// The chat service owns the messages table; this is the source of truth on a miss.
// Only "complete" messages come back, so a prompt still being answered is left out.
const loadFromChat = async (conversationId: string, userId: string): Promise<StoredTurn[]> => {
    const messages: StoredTurn[] = (await fetchMessages(conversationId, userId)).filter(isChatTurn)
    return messages.slice(-MAX_MESSAGES)
}

// Recent turns for a conversation. Redis first; on a miss (expired, evicted, or
// Redis down) rebuild from the chat service.
export const getMemory = async (conversationId: string, userId: string): Promise<ChatTurn[]> => {
    const cached = await readCache(conversationId)
    if (cached) return cached.map(toChatTurn)

    const recent = await loadFromChat(conversationId, userId)
    if (recent.length && redis) {
        try {
            // NX: never overwrite a list a concurrent addToMemory has already written
            await redis.set(key(conversationId), JSON.stringify(recent), "EX", TTL_SECONDS, "NX")
        } catch (error) {
            console.error("memory seed failed", error)
        }
    }
    return recent.map(toChatTurn)
}

// Runs atomically inside Redis, so concurrent appends to one conversation are
// serialized and cannot overwrite each other.
// KEYS[1] memory key
// ARGV[1] seed list (JSON) used only when the key is missing
// ARGV[2] turns to append (JSON)  ARGV[3] requestId ("" = none)
// ARGV[4] max messages  ARGV[5] ttl seconds
const APPEND_SCRIPT = `
local list
local raw = redis.call('GET', KEYS[1])
if raw then
  local ok, decoded = pcall(cjson.decode, raw)
  if ok and type(decoded) == 'table' then list = decoded end
end
if not list then list = cjson.decode(ARGV[1]) end

local requestId = ARGV[3]
if requestId ~= '' then
  for _, t in ipairs(list) do
    if t.requestId == requestId then return 0 end
  end
end

for _, t in ipairs(cjson.decode(ARGV[2])) do table.insert(list, t) end

local max = tonumber(ARGV[4])
local start = math.max(1, #list - max + 1)
local trimmed = {}
for i = start, #list do table.insert(trimmed, list[i]) end

redis.call('SET', KEYS[1], cjson.encode(trimmed), 'EX', tonumber(ARGV[5]))
return 1
`

// Append new turns and keep only the last MAX_MESSAGES. Resets the TTL.
// With a requestId, a retry of a request already in memory is a no-op.
export const addToMemory = async (
    conversationId: string,
    userId: string,
    turns: ChatTurn[],
    requestId?: string
): Promise<void> => {
    if (!redis || !turns.length) return
    try {
        // On a miss, rebuild prior history first so the append doesn't wipe it.
        // If chat already holds this request's turns, the requestId check skips them.
        const seed = (await readCache(conversationId)) ? [] : await loadFromChat(conversationId, userId)
        const stored: StoredTurn[] = turns.map((t) => (requestId ? { ...t, requestId } : t))

        await redis.eval(
            APPEND_SCRIPT,
            1,
            key(conversationId),
            JSON.stringify(seed),
            JSON.stringify(stored),
            requestId ?? "",
            String(MAX_MESSAGES),
            String(TTL_SECONDS)
        )
    } catch (error) {
        console.error("memory append failed", error)
    }
}
