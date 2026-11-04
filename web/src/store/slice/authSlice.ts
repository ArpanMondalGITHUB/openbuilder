import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { AuthState, User } from "../../types/user"
import authApi from "../../api/auth.api"
import { setToken } from "../../api/axios.config"
import type { AxiosError } from "axios"

// the auth service returns { message } for ApiError and for zod failures
const errorMessage = (err: unknown, fallback: string) =>
    (err as AxiosError<{ message?: string }>)?.response?.data?.message ?? fallback

const initialState: AuthState = {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    authChecked: false,
    isLoading: true,
    error: null,
}

export const checkCurrentUser = createAsyncThunk(
    "auth/checkCurrentUser",
    async (_, { rejectWithValue }) => {
        try {
            return await authApi.getCurrentUser()
        } catch (error) {
            return rejectWithValue(errorMessage(error, "Auth check failed"))
        }
    }
)

export const signup = createAsyncThunk(
    "auth/signup",
    async (payload: { name: string; email: string; password: string }, { rejectWithValue }) => {
        try {
            return await authApi.signup(payload)
        } catch (error) {
            return rejectWithValue(errorMessage(error, "Signup failed"))
        }
    }
)

export const login = createAsyncThunk(
    "auth/login",
    async (payload: { email: string; password: string }, { rejectWithValue }) => {
        try {
            return await authApi.login(payload)
        } catch (error) {
            return rejectWithValue(errorMessage(error, "Login failed"))
        }
    }
)

export const refreshToken = createAsyncThunk(
    "auth/refreshToken",
    async (_, { rejectWithValue }) => {
        try {
            return await authApi.refreshToken()
        } catch (error) {
            return rejectWithValue(errorMessage(error, "Token refresh failed"))
        }
    }
)

export const logout = createAsyncThunk(
    "auth/logout",
    async (_, { rejectWithValue }) => {
        try {
            await authApi.logout()
        } catch (error) {
            return rejectWithValue(errorMessage(error, "Logout failed"))
        }
    }
)

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(checkCurrentUser.pending, (state) => {
                state.isLoading = true
            })
            .addCase(checkCurrentUser.fulfilled, (state, action: PayloadAction<User>) => {
                state.isLoading = false
                state.isAuthenticated = true
                state.authChecked = true
                state.user = action.payload
                state.error = null
            })
            .addCase(checkCurrentUser.rejected, (state) => {
                state.isLoading = false
                state.user = null
                state.isAuthenticated = false
                state.authChecked = true
            })

        builder
            .addCase(signup.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(signup.fulfilled, (state, action) => {
                state.isLoading = false
                state.isAuthenticated = true
                state.user = action.payload.user
                state.accessToken = action.payload.accessToken
                setToken(action.payload.accessToken)
                state.error = null
            })
            .addCase(signup.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload as string
            })

        builder
            .addCase(login.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false
                state.isAuthenticated = true
                state.user = action.payload.user
                state.accessToken = action.payload.accessToken
                setToken(action.payload.accessToken)
                state.error = null
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.payload as string
            })

        builder
            .addCase(refreshToken.fulfilled, (state, action: PayloadAction<string>) => {
                state.accessToken = action.payload
                setToken(action.payload)
            })
            .addCase(refreshToken.rejected, (state) => {
                state.user = null
                state.accessToken = null
                state.isAuthenticated = false
                setToken(null)
            })

        builder
            .addCase(logout.fulfilled, (state) => {
                state.user = null
                state.accessToken = null
                state.isAuthenticated = false
                state.error = null
                setToken(null)
            })
            .addCase(logout.rejected, (state) => {
                // still clear the client side even if the server call failed
                state.user = null
                state.accessToken = null
                state.isAuthenticated = false
                setToken(null)
            })
    },
})

export const { clearError, setError } = authSlice.actions
export default authSlice.reducer
