import { NextFunction, Request, Response } from "express";
import {
    createConversation
} from "../db/chat.queries"
import { ApiError } from "../middlewares/chat.middlewares";

export const handleCreateConversation = async(req:Request,res:Response,next:NextFunction) => {
    try {
        const userId = (req as any).user?.id
        const {title} = req.body;

        if (!userId) throw new ApiError(401,"User is not authenticated UserId not found");
        if (!title) throw new ApiError(400, "Title is required");

        const conversation = await createConversation(userId,title);

        res.status(201).json({conversation});
    } catch (error) {
        next(error);
    }

};