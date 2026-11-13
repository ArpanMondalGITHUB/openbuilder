import { Router } from "express";
import { requireInternalKey } from "../middlewares/billing.middlewares";
import { handleConsumeUsage, handleRefundUsage } from "../controllers/internal.controllers";

// Mounted at /internal. Service-to-service only (agent → billing):
// needs x-internal-key, and the gateway never proxies this path.
const router = Router();

router.use(requireInternalKey);

router.post("/usage/consume", handleConsumeUsage);
router.post("/usage/refund", handleRefundUsage);

export default router;
