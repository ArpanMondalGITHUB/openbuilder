import { z } from "zod"

// Mirrors the auth service schemas so the user sees errors before a round trip.
export const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(80)
export const emailSchema = z.email("Enter a valid email").trim().toLowerCase()
export const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[a-z]/, "Needs a lowercase letter")
    .regex(/[A-Z]/, "Needs an uppercase letter")
    .regex(/[0-9]/, "Needs a number")

export const signInSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
})

export const signUpSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
})

export type SignIn = z.infer<typeof signInSchema>
export type SignUp = z.infer<typeof signUpSchema>