// Razorpay Checkout (https://checkout.razorpay.com/v1/checkout.js) wrapped in a promise.

export interface CheckoutResponse {
    razorpay_payment_id: string
    razorpay_subscription_id: string
    razorpay_signature: string
}

export interface CheckoutOptions {
    key: string
    subscription_id: string
    name: string
    description?: string
    prefill?: { name?: string; email?: string }
    theme?: { color?: string }
}

interface RazorpayInstance {
    open: () => void
    on: (event: "payment.failed", cb: (response: { error?: { description?: string } }) => void) => void
}
export type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance

declare global {
    interface Window {
        Razorpay?: RazorpayConstructor
    }
}

export class CheckoutDismissed extends Error {
    constructor() {
        super("Checkout closed")
    }
}
export class CheckoutFailed extends Error {}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js"
let loading: Promise<RazorpayConstructor> | null = null

// Adds the Checkout script once; later calls reuse it.
export const loadRazorpay = (): Promise<RazorpayConstructor> => {
    if (window.Razorpay) return Promise.resolve(window.Razorpay)
    if (loading) return loading
    loading = new Promise((resolve, reject) => {
        const script = document.createElement("script")
        script.src = SCRIPT_SRC
        script.async = true
        script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay failed to load")))
        script.onerror = () => {
            loading = null // allow a retry
            script.remove()
            reject(new Error("Couldn't load Razorpay. Check your connection or ad blocker."))
        }
        document.body.appendChild(script)
    })
    return loading
}

// Opens the popup. Resolves with the signed response on success. When the popup is closed
// without success, rejects with CheckoutFailed (a payment failed) or CheckoutDismissed.
// A failed payment does NOT reject right away: Razorpay keeps the popup open so the user
// can retry with another method, and that retry may still succeed.
export const openCheckout = (options: CheckoutOptions, Razorpay: RazorpayConstructor): Promise<CheckoutResponse> =>
    new Promise((resolve, reject) => {
        let lastFailure: string | null = null
        const rzp = new Razorpay({
            ...options,
            handler: (response: CheckoutResponse) => resolve(response),
            modal: {
                ondismiss: () => reject(lastFailure ? new CheckoutFailed(lastFailure) : new CheckoutDismissed()),
            },
        })
        rzp.on("payment.failed", (response) => {
            lastFailure = response.error?.description ?? "Payment failed"
        })
        rzp.open()
    })
