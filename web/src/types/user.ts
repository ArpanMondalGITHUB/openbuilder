export interface User {
    id: string
    name: string
    email: string
    createdAt: string
    updatedAt: string
}

// what signup and signin both return
export interface AuthResponse {
    user: User
    accessToken: string
}

export interface AuthState {
    user: User | null
    accessToken: string | null
    isAuthenticated: boolean
    authChecked: boolean
    isLoading: boolean
    error: string | null
}
