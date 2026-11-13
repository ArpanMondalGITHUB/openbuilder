import axios from "axios"

// Where "Upgrade" sends the user.
export const UPGRADE_PATH = "/billing"

// The backend answers 402 when the user is over their monthly prompt limit (billing → agent → chat).
// Returns what to show, or null for any other error.
export const limitReachedFrom = (error: unknown): { message: string } | null => {
    if (!axios.isAxiosError(error) || error.response?.status !== 402) return null
    const message = (error.response.data as { message?: unknown } | undefined)?.message
    return { message: typeof message === "string" && message ? message : "You've reached your monthly prompt limit." }
}

// 99900 paise → "₹999", 99950 → "₹999.50", 0 → "Free"
export const formatPrice = (paise: number): string => {
    if (paise === 0) return "Free"
    const rupees = paise / 100
    return `₹${Number.isInteger(rupees) ? rupees.toLocaleString("en-IN") : rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Width of the usage bar, 0..100
export const usagePercent = (used: number, limit: number): number => {
    if (limit <= 0) return 100
    return Math.min(100, Math.max(0, Math.round((used / limit) * 100)))
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// After Checkout succeeds, the plan only changes when Razorpay's webhook reaches billing,
// usually a few seconds later. Poll until the subscription shows the plan, or give up (null).
export const waitForPlan = async <T extends { plan: string }>(
    fetchSubscription: () => Promise<T>,
    plan: string,
    { tries = 15, intervalMs = 2000, sleep: wait = sleep }: { tries?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> } = {}
): Promise<T | null> => {
    for (let i = 0; i < tries; i++) {
        if (i > 0) await wait(intervalMs)
        try {
            const sub = await fetchSubscription()
            if (sub.plan === plan) return sub
        } catch {
            // network blip: try again
        }
    }
    return null
}
