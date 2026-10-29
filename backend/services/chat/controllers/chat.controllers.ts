import { NextFunction, Request, Response } from "express";
import {
    createConversation,
    createMessage,
    listMessages,
    listUserConversations,
    updateConversation,
} from "../db/chat.queries"
import { ApiError } from "../middlewares/chat.middlewares";

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

// Client only sends user messages; assistant messages are server-generated (AI hookup later).
export const handleSaveMessage = async(req:Request,res:Response,next:NextFunction) => {
    try {
        
        // conversationId comes from the URL, payload from the body
        const conversationId = req.params.conversationId as string
        const { content } = req.body;

        const message = await createMessage(conversationId, userIdOf(req), "user", content);
        // This would happen when we setup the llm
        // const reply = await callTheLLM(conversationHistory)
        // const assistantMessage = await createMessage(conversationId, userId, "assistant", reply)
        if (!message) throw new ApiError(404, "Conversation not found");

        res.status(201).json({message});
    } catch (error) {
        next(error);
    }
};
