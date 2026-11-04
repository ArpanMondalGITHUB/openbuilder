import axiosInstance from "./axios.config"
import type { AuthResponse, User } from "../types/user"
import type { SignIn, SignUp } from "../models/auth.zod_models"

const authApi = {
    signup: async (data: SignUp): Promise<AuthResponse> => {
        const { data: res } = await axiosInstance.post<AuthResponse>("/api/v1/auth/signup", data)
        return res
    },

    login: async (data: SignIn): Promise<AuthResponse> => {
        const { data: res } = await axiosInstance.post<AuthResponse>("/api/v1/auth/signin", data)
        return res
    },

    // the backend wraps it: { user: {...} }
    getCurrentUser: async (): Promise<User> => {
        const { data } = await axiosInstance.get<{ user: User }>("/api/v1/auth/me")
        return data.user
    },

    refreshToken: async (): Promise<string> => {
        const { data } = await axiosInstance.post<AuthResponse>("/api/v1/auth/refresh-token", {})
        return data.accessToken
    },

    logout: async (): Promise<void> => {
        await axiosInstance.post("/api/v1/auth/logout", {})
    },
}

export default authApi
