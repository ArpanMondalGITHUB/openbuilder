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

export const sendMessageSchema = z.object({
    content: contentSchema,
})

export const conversationIdParamSchema = z.object({
    id: conversationIdSchema,
})

// Types
export type CreateConversation = z.infer<typeof createConversationSchema>
export type SendMessage = z.infer<typeof sendMessageSchema>