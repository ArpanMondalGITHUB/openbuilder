import { z } from "zod"

// Primitives
export const promptSchema = z.string().trim().min(1, "Prompt is required").max(10_000)

// Forms
export const invokeGraphSchema = z.object({
    prompt: promptSchema,
})
