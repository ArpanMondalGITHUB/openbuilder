import { NextFunction, Request, Response } from "express";
import {
    createConversation,
    createMessage,
    listMessages,
    listUserConversations,
    updateConversation,
} from "../db/chat.queries"
import { ApiError } from "../middlewares/chat.middlewares";
import { config } from "../config/chat.config";
import { callAgent } from "../helpers/agent.helpers";

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
        const { content } = req.body;

        const isAgent = req.header("x-internal-key") === config.internalKey
        const role = isAgent ? "assistant" : "user"

        const message = await createMessage(conversationId, userIdOf(req), role, content);

        if (!message) throw new ApiError(404, "Conversation not found");

        if (role === "user") {
            await callAgent(conversationId, userIdOf(req), content)
            const messages = await listMessages(conversationId, userIdOf(req))
            res.status(201).json({ userMessage: message, assistantMessage: messages[messages.length - 1] })
            return
        }

        res.status(201).json({message});
    } catch (error) {
        next(error);
    }
};
