import { describe, expect, it, beforeEach, vi } from "vitest"
import reducer, {
    fetchSubscription, initialBillingState, loadPersistedBilling, persistBilling, setSubscription,
} from "./billingSlice"
import { checkCurrentUser, logout } from "./authSlice"
import type { Subscription } from "../../api/billing.api"

const builder: Subscription = {
    plan: "builder", status: "active", currentPeriodEnd: "2026-12-13T00:00:00.000Z",
    cancelAtPeriodEnd: false, usage: { used: 3, limit: 1000 },
}
const user = (id: string) => ({ id, name: "n", email: "e", createdAt: "", updatedAt: "" })

// tests run in node: give them a tiny in-memory localStorage
const mem = new Map<string, string>()
vi.stubGlobal("localStorage", {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
})

describe("billingSlice", () => {
    beforeEach(() => localStorage.clear())

    it("stores the subscription after a successful fetch", () => {
        const s = reducer(initialBillingState, fetchSubscription.fulfilled({ subscription: builder, ownerId: "u1" }, "r"))
        expect(s.subscription?.plan).toBe("builder")
        expect(s.ownerId).toBe("u1")
    })

    it("keeps the cached plan on screen when a refresh fails", () => {
        const s1 = reducer(initialBillingState, setSubscription({ subscription: builder, ownerId: "u1" }))
        const s2 = reducer(s1, fetchSubscription.rejected(new Error("x"), "r"))
        expect(s2.subscription?.plan).toBe("builder")
    })

    it("round-trips through localStorage", () => {
        persistBilling({ subscription: builder, ownerId: "u1", status: "succeeded" })
        expect(loadPersistedBilling()).toEqual({ subscription: builder, ownerId: "u1", status: "idle" })
    })

    it("ignores corrupt storage", () => {
        localStorage.setItem("openbuilder.billing", "{not json")
        expect(loadPersistedBilling()).toEqual(initialBillingState)
    })

    it("drops the cached plan on logout and when another user signs in", () => {
        const s = reducer(initialBillingState, setSubscription({ subscription: builder, ownerId: "u1" }))
        expect(reducer(s, logout.fulfilled(undefined, "r")).subscription).toBeNull()
        expect(reducer(s, checkCurrentUser.fulfilled(user("u2"), "r")).subscription).toBeNull()
        expect(reducer(s, checkCurrentUser.fulfilled(user("u1"), "r")).subscription?.plan).toBe("builder")
    })
})
