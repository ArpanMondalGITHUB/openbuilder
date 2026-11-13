import { describe, expect, it } from "vitest"
import { AxiosError, type AxiosResponse } from "axios"
import { formatPrice, limitReachedFrom, usagePercent, waitForPlan } from "./billing"

describe("formatPrice", () => {
    it("formats paise as whole rupees", () => {
        expect(formatPrice(99900)).toBe("₹999")
        expect(formatPrice(49900)).toBe("₹499")
    })
    it("keeps paise when there are any", () => {
        expect(formatPrice(99950)).toBe("₹999.50")
    })
    it("shows Free for zero", () => {
        expect(formatPrice(0)).toBe("Free")
    })
})

describe("usagePercent", () => {
    it("is used / limit as a whole percent", () => {
        expect(usagePercent(5, 20)).toBe(25)
    })
    it("is clamped to 0..100", () => {
        expect(usagePercent(30, 20)).toBe(100)
        expect(usagePercent(-1, 20)).toBe(0)
    })
    it("is 100 when the limit is 0", () => {
        expect(usagePercent(0, 0)).toBe(100)
    })
})

describe("waitForPlan", () => {
    const noSleep = () => Promise.resolve()

    it("resolves once the subscription shows the expected plan", async () => {
        const answers = [{ plan: "free" }, { plan: "free" }, { plan: "pro" }]
        let calls = 0
        const sub = await waitForPlan(async () => answers[calls++], "pro", { tries: 5, sleep: noSleep })
        expect(sub.plan).toBe("pro")
        expect(calls).toBe(3)
    })
    it("returns null when the plan never changes", async () => {
        let calls = 0
        const sub = await waitForPlan(async () => (calls++, { plan: "free" }), "pro", { tries: 3, sleep: noSleep })
        expect(sub).toBeNull()
        expect(calls).toBe(3)
    })
    it("keeps trying when a fetch fails", async () => {
        let calls = 0
        const sub = await waitForPlan(
            async () => {
                calls++
                if (calls === 1) throw new Error("network")
                return { plan: "pro" }
            },
            "pro",
            { tries: 3, sleep: noSleep }
        )
        expect(sub?.plan).toBe("pro")
    })
})

const httpError = (status: number, data: unknown) =>
    new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, { status, data } as AxiosResponse)

describe("limitReachedFrom", () => {
    it("recognises a 402 and keeps the server's message", () => {
        expect(limitReachedFrom(httpError(402, { message: "Monthly prompt limit reached", upgrade: true }))).toEqual({
            message: "Monthly prompt limit reached",
        })
    })
    it("falls back to a default message when the 402 has none", () => {
        expect(limitReachedFrom(httpError(402, {}))?.message).toMatch(/limit/i)
    })
    it("ignores other HTTP errors", () => {
        expect(limitReachedFrom(httpError(500, { message: "boom" }))).toBeNull()
        expect(limitReachedFrom(httpError(401, {}))).toBeNull()
    })
    it("ignores network errors and non-axios errors", () => {
        expect(limitReachedFrom(new AxiosError("timeout", "ECONNABORTED"))).toBeNull()
        expect(limitReachedFrom(new Error("x"))).toBeNull()
        expect(limitReachedFrom(undefined)).toBeNull()
    })
})
