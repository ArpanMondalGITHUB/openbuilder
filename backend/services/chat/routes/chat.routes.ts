import { Router } from "express"
import { requireGatewayUser, validate } from "../middlewares/chat.middlewares"

import {
    conversationIdParamSchema,
    createConversationSchema,
    sendMessageSchema,
} from "../models/chat.zod_models"

const router = Router()

router.use(requireGatewayUser)

router.post("/conversations", validate(createConversationSchema),)
router.get("/conversations", )
router.get("/conversations/:id/messages", validate(conversationIdParamSchema, "params"), )
router.post("/conversations/:id/messages", validate(conversationIdParamSchema, "params"), validate(sendMessageSchema), )

export default router