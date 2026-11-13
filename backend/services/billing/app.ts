import express from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { errorHandler } from "./middlewares/billing.middlewares";
import { handleRazorpayWebhook } from "./controllers/webhook.controllers";
import billingRouter from "./routes/billing.routes";
import internalRouter from "./routes/internal.routes";

// The app is built here and started in index.ts, so tests can run it on a random port.
export const app = express();

app.set("trust proxy", 1);
app.use(morgan("dev"));

// Razorpay webhook: MUST come before express.json(). The signature is over the exact raw bytes,
// so req.body has to stay a Buffer. No user auth here; the signature is the auth.
app.post(
    "/api/v1/billing/webhooks/razorpay",
    express.raw({ type: "application/json", limit: "1mb" }),
    handleRazorpayWebhook
);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/", (_req, res) => {
    res.json({ status: "hello from billing" });
});

app.use("/api/v1/billing", billingRouter);   // via gateway (JWT → x-user-id)
app.use("/internal", internalRouter);        // agent only (x-internal-key), not proxied

app.use(errorHandler);
