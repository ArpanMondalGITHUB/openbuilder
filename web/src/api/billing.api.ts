import axiosInstance from "./axios.config"
import type { CheckoutResponse } from "../lib/razorpay"

export type PlanId = "free" | "pro" | "builder"
export type PaidPlanId = Exclude<PlanId, "free">

export interface Plan {
    id: PlanId
    name: string
    price: number // paise per month
    currency: string
    promptLimit: number
}

export interface Subscription {
    plan: PlanId
    status: string
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    usage: { used: number; limit: number }
}

export interface Payment {
    id: string
    razorpay_payment_id: string
    plan: PaidPlanId
    amount: number // paise
    currency: string
    status: string
    created_at: string
}

const billingApi = {
    getPlans: async (): Promise<Plan[]> => {
        const { data } = await axiosInstance.get<{ plans: Plan[] }>("/api/v1/billing/plans")
        return data.plans
    },

    getSubscription: async (): Promise<Subscription> => {
        const { data } = await axiosInstance.get<Subscription>("/api/v1/billing/subscription")
        return data
    },

    // creates the subscription at Razorpay; open Checkout with the returned id and key
    createSubscription: async (planId: PaidPlanId): Promise<{ subscriptionId: string; keyId: string }> => {
        const { data } = await axiosInstance.post<{ subscriptionId: string; keyId: string }>(
            "/api/v1/billing/subscription",
            { planId }
        )
        return data
    },

    // checks the Checkout signature, syncs the subscription from Razorpay and returns it
    // (same shape as getSubscription). Safe to call repeatedly while the plan activates.
    verify: async (response: CheckoutResponse): Promise<Subscription> => {
        const { data } = await axiosInstance.post<Subscription>("/api/v1/billing/subscription/verify", response)
        return data
    },

    cancel: async (): Promise<{ cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null }> => {
        const { data } = await axiosInstance.post("/api/v1/billing/subscription/cancel")
        return data
    },

    listPayments: async (): Promise<Payment[]> => {
        const { data } = await axiosInstance.get<{ payments: Payment[] }>("/api/v1/billing/payments")
        return data.payments
    },
}

export default billingApi
