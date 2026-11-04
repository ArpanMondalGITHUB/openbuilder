import axios from "axios"
import type { AuthResponse } from "../types/user"

const TOKEN_KEY = "accessToken"

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const setToken = (token: string | null) => {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
}

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
    headers: { "Content-Type": "application/json" },
    withCredentials: true, // the refresh token lives in an HttpOnly cookie
})

// attach the access token to every request
axiosInstance.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

let isRefreshing = false
let failedQueue: { resolve: (value: unknown) => void; reject: (reason: unknown) => void }[] = []

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error)
        else resolve(token)
    })
    failedQueue = []
}

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (!error.response || error.response.status !== 401) {
            return Promise.reject(error)
        }

        // never retry the refresh call itself — that would loop forever
        if (originalRequest.url?.includes("/refresh-token")) {
            return Promise.reject(error)
        }

        if (originalRequest._retry) {
            return Promise.reject(error)
        }

        // hold other 401s until the refresh finishes
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject })
            }).then(() => axiosInstance(originalRequest))
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
            const { data } = await axiosInstance.post<AuthResponse>(
                "/api/v1/auth/refresh-token",
                {},
                { withCredentials: true }
            )

            setToken(data.accessToken)
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
            processQueue(null, data.accessToken)

            return axiosInstance(originalRequest)
        } catch (err) {
            setToken(null)
            processQueue(err)
            return Promise.reject(err)
        } finally {
            isRefreshing = false
        }
    }
)

export default axiosInstance
