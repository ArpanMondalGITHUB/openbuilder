import { Router } from "express";
import { requireGatewayUser, validate } from "../middlewares/billing.middlewares";
import { createSubscriptionSchema, verifySubscriptionSchema } from "../models/billing.models";
import {
    handleCancelSubscription,
    handleCreateSubscription,
    handleGetPlans,
    handleGetSubscription,
    handleListPayments,
    handleVerifySubscription,
} from "../controllers/billings.controllers";

// Mounted at /api/v1/billing. The gateway checks the JWT and forwards x-user-id.
// (The webhook lives in app.ts: it needs express.raw() and no user.)
const router = Router();

// No user needed: static plan list
router.get("/plans", handleGetPlans);

// Everything below needs the gateway user
router.use(requireGatewayUser);

router.get("/subscription", handleGetSubscription);
router.post("/subscription", validate(createSubscriptionSchema), handleCreateSubscription);
router.post("/subscription/verify", validate(verifySubscriptionSchema), handleVerifySubscription);
// no body: always cancels at the end of the cycle
router.post("/subscription/cancel", handleCancelSubscription);
router.get("/payments", handleListPayments);


export default router;
