import { z } from "zod"

export const promptSchema = z.string().trim().min(1, "Prompt is required").max(10_000)
export const conversationIdSchema = z.uuid("Invalid conversation id")
export const chatTurnSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
})
export type ChatTurn = z.infer<typeof chatTurnSchema>;

export const invokeGraphSchema = z.object({
    prompt: promptSchema,
    history: z.array(chatTurnSchema).default([]),
})

export const conversationIdParamSchema = z.object({
    conversationId: conversationIdSchema,
})
