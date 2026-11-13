import { NextFunction, Request, Response } from "express";
import {
    createConversation,
    createMessage,
    failAttemptIfPending,
    findUserMessageByRequestId,
    listMessages,
    listUserConversations,
    setAttemptStatus,
    updateConversation,
} from "../db/chat.queries"
import { ApiError } from "../middlewares/chat.middlewares";
import { config } from "../config/chat.config";
import { callAgent, cancelAgent } from "../helpers/agent.helpers";
import { messageRoleFrom } from "../helpers/role.helpers";
import { idempotencyKeySchema } from "../models/chat.zod_models";
import { randomUUID } from "crypto";

const userIdOf = (req: Request): string => {
    const userId = (req as any).user?.id
    if (!userId) throw new ApiError(401, "User is not authenticated UserId not found")
    return userId
}

export const handleCreateConversation = async(req:Request,res:Response,next:NextFunction) => {
    try {
        const userId = userIdOf(req)
        const {title} = req.body;

        if (!title) throw new ApiError(400, "Title is required");

        const conversation = await createConversation(userId,title);

        res.status(201).json({conversation});
    } catch (error) {
        next(error);
    }

};

export const handleGetConversation = async(req:Request,res:Response,next:NextFunction) => {
    try {
        const conversations = (await listUserConversations(userIdOf(req)))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (!conversations) throw new ApiError(400,"no conversaion found ");

        res.json({conversations});
    } catch (error) {
        next(error);
    }
};

export const handleUpdateConversation = async(req:Request,res:Response,next:NextFunction) => {
    try {
        const conversationId = req.params.conversationId as string
        const { title } = req.body;

        const conversation = await updateConversation(conversationId, userIdOf(req), title);
        if (!conversation) throw new ApiError(404, "Conversation not found");

        res.json({conversation});
    } catch (error) {
        next(error);
    }
};

export const handleGetMessage = async(req:Request,res:Response,next:NextFunction) => {
    try {
        // Zod already validated req.params.conversationId as a UUID string
        const conversationId = req.params.conversationId as string

        const messages = await listMessages(conversationId, userIdOf(req));

        res.json({messages});
    } catch (error) {
        next(error);
    }
};

export const handleSaveMessage = async(req:Request,res:Response,next:NextFunction) => {
    try {
        
        // conversationId comes from the URL, payload from the body
        const conversationId = req.params.conversationId as string
        const userId = userIdOf(req)
        const { content } = req.body;

        // only the agent service may write an assistant message — a wrong key means
        // misconfiguration, so fail loudly instead of silently saving it as a user message
        const role = messageRoleFrom(req.header("x-internal-key"), config.internalKey)

                const rawKey = req.header("idempotency-key")
        if (rawKey && !idempotencyKeySchema.safeParse(rawKey).success) {
            throw new ApiError(400, "Invalid Idempotency-Key header")
        }
        const requestId = rawKey || randomUUID()

        if (role === "assistant") {
            // the user pressed Stop — drop the late reply (the agent treats 409 as cancelled)
            const attempt = await findUserMessageByRequestId(conversationId, userId, requestId)
            if (attempt?.status === "cancelled") {
                return res.status(409).json({ message: "Request was cancelled" })
            }
            const message = await createMessage(conversationId, userId, role, content, requestId, "complete")
            if (!message) throw new ApiError(404, "Conversation not found")
            await setAttemptStatus(conversationId, userId, requestId, "complete")
            return res.status(201).json({ message })
        }

        const existing = await findUserMessageByRequestId(conversationId, userId, requestId)
        if (existing) {
            const messages = await listMessages(conversationId, userId)
            const reply = messages.find(m => m.role === "assistant" && m.request_id === requestId) ?? null

            if (existing.status === "complete") {
                return res.status(200).json({ userMessage: existing, assistantMessage: reply, status: "complete", requestId })
            }
            if (existing.status === "pending") {
                return res.status(202).json({ userMessage: existing, assistantMessage: reply, status: "pending", requestId })
            }

                        // failed — run the agent again on the same attempt
            await setAttemptStatus(conversationId, userId, requestId, "pending")
            callAgent(conversationId, userId, content, requestId).catch( async (error) => {
                console.error("agent retry failed", error)
                if ((error as any)?.code !== "ECONNABORTED") {
                    await failAttemptIfPending(conversationId, userId, requestId).catch(console.error)
                }
            })
            return res.status(202).json({ userMessage: existing, status: "pending", requestId })
        }

        let message
        try {
            message = await createMessage(conversationId, userId, role, content, requestId, "pending")
        } catch (error) {
            // two retries raced — the unique index kept one, reuse it
            if ((error as any)?.code === "23505") {
                const raced = await findUserMessageByRequestId(conversationId, userId, requestId)
                if (raced) return res.status(202).json({ userMessage: raced, status: raced.status, requestId })
            }
            throw error
        }

        if (!message) throw new ApiError(404, "Conversation not found");

        // a failure marks the attempt failed, so a retry knows to run the agent again
        try {
            await callAgent(conversationId, userId, content, requestId)
        } catch (error) {
            // the agent answers 499 when the user stopped this attempt
            if ((error as any)?.response?.status === 499) {
                return res.status(499).json({ userMessage: message, status: "cancelled", requestId })
            }
            // over the monthly prompt limit (billing → agent → here): show "upgrade", not a server error
            if ((error as any)?.response?.status === 402) {
                await failAttemptIfPending(conversationId, userId, requestId)
                return res.status(402).json({
                    message: (error as any).response.data?.message ?? "Monthly prompt limit reached",
                    upgrade: true,
                    userMessage: message,
                    status: "failed",
                    requestId,
                })
            }
            // a timeout does not mean the agent died — it may still be running and will call back
            if ((error as any)?.code !== "ECONNABORTED") {
                await failAttemptIfPending(conversationId, userId, requestId)
            }
            throw error
        }

        const messages = await listMessages(conversationId, userId)
        const reply = messages.find(m => m.role === "assistant" && m.request_id === requestId) ?? null
        res.status(201).json({ userMessage: message, assistantMessage: reply, status: "complete", requestId })

    } catch (error) {
        next(error);
    }
    
};

export const handleCancelMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const conversationId = req.params.conversationId as string
        const requestId = req.params.requestId as string
        const userId = userIdOf(req)

        const attempt = await findUserMessageByRequestId(conversationId, userId, requestId)
        if (!attempt) throw new ApiError(404, "Message not found")

        // already answered or failed — nothing to stop
        if (attempt.status !== "pending") {
            return res.json({ status: attempt.status, requestId })
        }

        await setAttemptStatus(conversationId, userId, requestId, "cancelled")
        cancelAgent(conversationId, userId, requestId).catch((error) =>
            console.error("agent cancel failed", error?.message ?? error)
        )
        res.json({ status: "cancelled", requestId })
    } catch (error) {
        next(error)
    }
};
