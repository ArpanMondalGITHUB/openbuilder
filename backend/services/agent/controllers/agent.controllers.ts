import axios from "axios";
import type { NextFunction, Request, Response } from "express"
import { graph } from "../graph/graph"
import { ApiError } from "../middlewares/agent.middlewares"
import { config } from "../config/agent.config";
import { getMemory, addToMemory } from "../config/memory"
import { inflight, inflightKey } from "../config/inflight"

const userIdOf = (req: Request): string => {
    const userId = (req as any).user?.id
    if (!userId) throw new ApiError(401, "User is not authenticated")
    return userId
}

// 499 = client closed request; chat treats it as "cancelled", not as a failure
const CANCELLED = 499

export const handleInvokeGraph = async (req: Request, res: Response, next: NextFunction) => {
    const controller = new AbortController()
    let key: string | null = null

    try {
        const conversationId = req.params.conversationId as string
        const { prompt } = req.body
        if (!conversationId) throw new ApiError(400,"ConversationId is required");
        if (!prompt) throw new ApiError(400, "Prompt is required");

        const userId = userIdOf(req)
        const idempotencyKey = req.header("idempotency-key")
        if (idempotencyKey) {
            key = inflightKey(userId, idempotencyKey)
            inflight.set(key, controller)
        }

        const history = await getMemory(conversationId, userId)

        // the signal stops the graph between nodes, and inside a node when it passes config to llm.invoke
        const result = await graph.invoke({ prompt, conversationId, history }, { signal: controller.signal })
        if (controller.signal.aborted) {
            return res.status(CANCELLED).json({ message: "Cancelled" })
        }

        // Hand the answer back to chat — chat owns the messages table.
        // Keep the row chat saved so we can hand that exact message back to it.
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "x-internal-key": config.internalKey,
            "x-user-id": userId,
        }
        if (idempotencyKey) headers["idempotency-key"] = idempotencyKey

        await axios.post(
            `${config.chatUrl}/api/v1/chat/conversations/${conversationId}/messages`,
            { content: result.aiResponse },
            {
                headers,
                timeout: 10_000,
            }
        )

        await addToMemory(conversationId, userId, [
            { role: "user", content: prompt },
            { role: "assistant", content: result.aiResponse },
        ], idempotencyKey)

        res.status(200).json({ result })
    } catch (error) {
        // stopped by the user, or chat refused the reply because the attempt was cancelled:
        // nothing is saved to memory and it isn't a server error
        if (controller.signal.aborted || (error as any)?.response?.status === 409) {
            return res.status(CANCELLED).json({ message: "Cancelled" })
        }
        next(error)
    } finally {
        if (key) inflight.delete(key)
    }
}

export const handleCancelGraph = (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = userIdOf(req)
        const requestId = req.header("idempotency-key")
        if (!requestId) throw new ApiError(400, "Idempotency-Key header is required")

        const key = inflightKey(userId, requestId)
        const running = inflight.get(key)
        running?.abort()
        inflight.delete(key)
        res.json({ cancelled: Boolean(running) })
    } catch (error) {
        next(error)
    }
}
