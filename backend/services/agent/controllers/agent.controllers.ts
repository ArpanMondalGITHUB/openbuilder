import axios from "axios";
import type { NextFunction, Request, Response } from "express"
import { graph } from "../graph/graph"
import { ApiError } from "../middlewares/agent.middlewares"
import { config } from "../config/agent.config";


const userIdOf = (req: Request): string => {
    const userId = (req as any).user?.id
    if (!userId) throw new ApiError(401, "User is not authenticated")
    return userId
}

export const handleInvokeGraph = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const conversationId = req.params.conversationId as string
        const { prompt,history } = req.body
        if (!conversationId) throw new ApiError(400,"ConversationId is required");
        if (!prompt) throw new ApiError(400, "Prompt is required");
        
        const result = await graph.invoke({ prompt, conversationId, history })

        // Hand the answer back to chat — chat owns the messages table
        await axios.post(
            `${config.chatUrl}/api/v1/chat/conversations/${conversationId}/messages`,
            { content: result.aiResponse },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-internal-key": config.internalKey,
                    "x-user-id": userIdOf(req),
                },
                timeout: 10_000,
            }
        )

        res.status(200).json({ result })
    } catch (error) {
        next(error)
    }
}
