import axios from "axios"
import { config } from "../config/agent.config"
import { ApiError } from "../middlewares/agent.middlewares"

// How the agent talks to the billing service (internal routes, never through the gateway).

const internalHeaders = (userId: string) => ({
    "x-internal-key": config.internalKey,
    "x-user-id": userId,
})

// Count one prompt against the user's monthly limit, before running the graph.
// - 402 from billing → throws ApiError(402): the user is over the limit, don't run.
// - Billing down / slow / misconfigured → FAIL OPEN: log it and let the prompt through
//   (counted: false), so a billing outage doesn't take chat down with it.
export const consumePrompt = async (userId: string): Promise<{ counted: boolean }> => {
    try {
        await axios.post(`${config.billingUrl}/internal/usage/consume`, {}, {
            headers: internalHeaders(userId),
            timeout: 2_000,
        })
        return { counted: true }
    } catch (error) {
        if ((error as any)?.response?.status === 402) {
            throw new ApiError(402, "Monthly prompt limit reached. Upgrade your plan to keep going.")
        }
        console.error("billing consume failed, allowing prompt:", (error as any)?.message ?? error)
        return { counted: false }
    }
}

// Give the prompt back when a counted run didn't produce an answer (failed or cancelled).
// Best effort: never throws, so it can't hide the real error.
export const refundPrompt = async (userId: string): Promise<void> => {
    try {
        await axios.post(`${config.billingUrl}/internal/usage/refund`, {}, {
            headers: internalHeaders(userId),
            timeout: 2_000,
        })
    } catch (error) {
        console.error("billing refund failed:", (error as any)?.message ?? error)
    }
}
