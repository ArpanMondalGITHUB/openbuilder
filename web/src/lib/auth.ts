import axios from "axios"
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

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
    withCredentials: true, // the refresh token lives in an HttpOnly cookie
})

export type AuthUser = {
    id: string
    name: string
    email: string
    createdAt: string
    updatedAt: string
}

export type AuthResponse = {
    user: AuthUser
    accessToken: string
}

export const signIn = async (payload: SignIn) => {
    const { data } = await api.post<AuthResponse>("/api/v1/auth/signin", payload)
    return data
}

export const signUp = async (payload: SignUp) => {
    const { data } = await api.post<AuthResponse>("/api/v1/auth/signup", payload)
    return data
}

export const storeSession = (data: AuthResponse) => {
    localStorage.setItem("accessToken", data.accessToken)
    localStorage.setItem("user", JSON.stringify(data.user))
}

export const clearSession = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("user")
}
