import { describe, expect, it } from "vitest"
import {
    CheckoutDismissed,
    CheckoutFailed,
    openCheckout,
    type CheckoutResponse,
    type RazorpayConstructor,
} from "./razorpay"

type PassedOptions = {
    subscription_id: string
    handler: (r: CheckoutResponse) => void
    modal: { ondismiss: () => void }
}
type FailedCallback = (r: { error?: { description?: string } }) => void

// Fake Razorpay: records the options and lets the test trigger handler / dismiss / failure.
const fakeRazorpay = () => {
    const state: { options?: PassedOptions; opened: boolean; failedCb?: FailedCallback } = { opened: false }
    class FakeRazorpay {
        constructor(options: Record<string, unknown>) {
            state.options = options as unknown as PassedOptions
        }
        open() {
            state.opened = true
        }
        on(event: string, cb: FailedCallback) {
            if (event === "payment.failed") state.failedCb = cb
        }
    }
    return { Ctor: FakeRazorpay as RazorpayConstructor, state }
}

const base = { key: "rzp_test_x", subscription_id: "sub_1", name: "OpenBuilder" }

describe("openCheckout", () => {
    it("opens checkout and resolves with the handler response", async () => {
        const { Ctor, state } = fakeRazorpay()
        const done = openCheckout(base, Ctor)
        expect(state.opened).toBe(true)
        expect(state.options!.subscription_id).toBe("sub_1")
        const response = { razorpay_payment_id: "pay_1", razorpay_subscription_id: "sub_1", razorpay_signature: "a".repeat(64) }
        state.options!.handler(response)
        await expect(done).resolves.toEqual(response)
    })

    it("rejects with CheckoutDismissed when the user closes the popup", async () => {
        const { Ctor, state } = fakeRazorpay()
        const done = openCheckout(base, Ctor)
        state.options!.modal.ondismiss()
        await expect(done).rejects.toBeInstanceOf(CheckoutDismissed)
    })

    it("rejects with CheckoutFailed and Razorpay's reason when a failed payment's popup is closed", async () => {
        const { Ctor, state } = fakeRazorpay()
        const done = openCheckout(base, Ctor)
        state.failedCb!({ error: { description: "Card declined" } })
        state.options!.modal.ondismiss()
        await expect(done).rejects.toThrow("Card declined")
        await expect(done).rejects.toBeInstanceOf(CheckoutFailed)
    })

    it("still resolves when the user retries in the popup after a failed payment", async () => {
        const { Ctor, state } = fakeRazorpay()
        const done = openCheckout(base, Ctor)
        state.failedCb!({ error: { description: "Card declined" } }) // Razorpay keeps the popup open
        const response = { razorpay_payment_id: "pay_2", razorpay_subscription_id: "sub_1", razorpay_signature: "b".repeat(64) }
        state.options!.handler(response)
        await expect(done).resolves.toEqual(response)
    })
})
