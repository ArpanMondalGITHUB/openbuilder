import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slice/authSlice'
import billingReducer, { loadPersistedBilling, persistBilling } from './slice/billingSlice'

export const store = configureStore({
    reducer: {
        auth: authReducer,
        billing: billingReducer,
    },
    preloadedState: { billing: loadPersistedBilling() },
})

// save billing whenever it changes (reference check keeps this cheap)
let lastBilling = store.getState().billing
store.subscribe(() => {
    const billing = store.getState().billing
    if (billing !== lastBilling) {
        lastBilling = billing
        persistBilling(billing)
    }
})

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
