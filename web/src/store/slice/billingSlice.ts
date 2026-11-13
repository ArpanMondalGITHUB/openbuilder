import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import billingApi, { type Subscription } from "../../api/billing.api"
import { checkCurrentUser, login, logout, refreshToken, signup } from "./authSlice"

export interface BillingState {
    subscription: Subscription | null
    ownerId: string | null // whose subscription this is, so a cached plan never leaks to another account
    status: "idle" | "loading" | "succeeded" | "failed"
}

export const initialBillingState: BillingState = { subscription: null, ownerId: null, status: "idle" }

const STORAGE_KEY = "openbuilder.billing"

// Cached copy so the plan shows instantly on reload. The server stays the source of truth:
// the Billing page always refetches and overwrites it.
export const loadPersistedBilling = (): BillingState => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return initialBillingState
        const saved = JSON.parse(raw) as Partial<BillingState>
        if (!saved.subscription || !saved.ownerId) return initialBillingState
        return { subscription: saved.subscription, ownerId: saved.ownerId, status: "idle" }
    } catch {
        return initialBillingState
    }
}

export const persistBilling = (state: BillingState) => {
    try {
        if (state.subscription && state.ownerId) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ subscription: state.subscription, ownerId: state.ownerId }))
        } else {
            localStorage.removeItem(STORAGE_KEY)
        }
    } catch {
        // private mode / storage blocked: the in-memory store still works
    }
}

type ThunkState = { auth: { user: { id: string } | null } }

export const fetchSubscription = createAsyncThunk("billing/fetchSubscription", async (_, { getState }) => {
    const subscription = await billingApi.getSubscription()
    return { subscription, ownerId: (getState() as ThunkState).auth.user?.id ?? null }
})

const billingSlice = createSlice({
    name: "billing",
    initialState: initialBillingState,
    reducers: {
        setSubscription: (state, action: PayloadAction<{ subscription: Subscription; ownerId: string | null }>) => {
            state.subscription = action.payload.subscription
            state.ownerId = action.payload.ownerId
            state.status = "succeeded"
        },
        patchSubscription: (state, action: PayloadAction<Partial<Subscription>>) => {
            if (state.subscription) Object.assign(state.subscription, action.payload)
        },
        clearBilling: () => initialBillingState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSubscription.pending, (state) => {
                state.status = "loading"
            })
            .addCase(fetchSubscription.fulfilled, (state, action) => {
                state.subscription = action.payload.subscription
                state.ownerId = action.payload.ownerId
                state.status = "succeeded"
            })
            .addCase(fetchSubscription.rejected, (state) => {
                state.status = "failed" // keep the cached subscription on screen
            })
            // a different account (or nobody) is now signed in: drop the cached plan
            .addCase(checkCurrentUser.fulfilled, (state, action) =>
                state.ownerId && state.ownerId !== action.payload.id ? initialBillingState : state
            )
            .addCase(login.fulfilled, () => initialBillingState)
            .addCase(signup.fulfilled, () => initialBillingState)
            .addCase(logout.fulfilled, () => initialBillingState)
            .addCase(logout.rejected, () => initialBillingState)
            .addCase(refreshToken.rejected, () => initialBillingState)
    },
})

export const { setSubscription, patchSubscription, clearBilling } = billingSlice.actions
export default billingSlice.reducer
