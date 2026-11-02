import { Router } from "express"
import { requireGatewayUser, validate } from "../middlewares/agent.middlewares"
import { handleInvokeGraph } from "../controllers/agent.controllers"
import { conversationIdParamSchema, invokeGraphSchema } from "../models/agent.zod_models"
const router = Router()
router.use(requireGatewayUser)

router.post("/conversations/:conversationId",
    validate(conversationIdParamSchema, "params"),
    validate(invokeGraphSchema),
    handleInvokeGraph)

export default router
