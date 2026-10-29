import { z } from "zod"

// Primitives
export const titleSchema = z.string().trim().min(1, "Title is required").max(200)
export const contentSchema = z.string().trim().min(1, "Content is required").max(10_000)
export const conversationIdSchema = z.uuid("Invalid conversation id")
export const messageRoleSchema = z.enum(["user", "assistant"])

// Forms
export const createConversationSchema = z.object({
    title: titleSchema,
})

export const updateConversationSchema = z.object({
    title: titleSchema,
})

// Role is NOT client-supplied. The route always writes "user";
// the assistant reply is inserted server-side when the AI is wired up.
export const saveMessageSchema = z.object({
    content: contentSchema,
})

export const conversationIdParamSchema = z.object({
    conversationId: conversationIdSchema,
})

// Types
export type CreateConversation = z.infer<typeof createConversationSchema>
export type SendMessage = z.infer<typeof saveMessageSchema>