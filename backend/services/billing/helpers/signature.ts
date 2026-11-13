import crypto from "node:crypto";
import { config } from "../config/billing.config";

const hmacHex = (secret: string, data: string | Buffer) =>
    crypto.createHmac("sha256", secret).update(data).digest("hex");

// Constant-time compare of two hex strings. Malformed or different-length input → false (never throws).
const safeEqualHex = (expectedHex: string, receivedHex: string | undefined): boolean => {
    if (!receivedHex) return false;
    const expected = Buffer.from(expectedHex, "hex");
    const received = Buffer.from(receivedHex, "hex"); // invalid hex decodes short, caught by the length check
    return expected.length > 0 && expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

// Checkout handler response for a subscription: HMAC(payment_id + "|" + subscription_id, KEY secret)
export const verifyCheckoutSignature = (paymentId: string, subscriptionId: string, signature: string): boolean =>
    safeEqualHex(hmacHex(config.razorpayKeySecret, `${paymentId}|${subscriptionId}`), signature);

// Webhook: HMAC(exact raw body bytes, WEBHOOK secret). Must be the Buffer from express.raw, not re-stringified JSON.
export const verifyWebhookSignature = (rawBody: Buffer, signature: string | undefined): boolean =>
    safeEqualHex(hmacHex(config.razorpayWebhookSecret, rawBody), signature);
