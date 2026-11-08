import { Router } from "express"
import { requireGatewayUser, validate } from "../middlewares/agent.middlewares"
import { handleCancelGraph, handleInvokeGraph } from "../controllers/agent.controllers"
import { conversationIdParamSchema, invokeGraphSchema } from "../models/agent.zod_models"
const router = Router()
router.use(requireGatewayUser)

router.post("/conversations/:conversationId",
    validate(conversationIdParamSchema, "params"),
    validate(invokeGraphSchema),
    handleInvokeGraph)

// requestId travels in the Idempotency-Key header, same as on invoke
router.post("/conversations/:conversationId/cancel",
    validate(conversationIdParamSchema, "params"),
    handleCancelGraph)

export default router
