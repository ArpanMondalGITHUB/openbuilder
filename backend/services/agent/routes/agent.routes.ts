import { Router } from "express"
import { requireGatewayUser, validate } from "../middlewares/agent.middlewares"
import { handleInvokeGraph } from "../controllers/agent.controllers"
import { invokeGraphSchema } from "../models/agent.zod_models"

const router = Router()

router.use(requireGatewayUser)

router.post("/", validate(invokeGraphSchema), handleInvokeGraph)

export default router
