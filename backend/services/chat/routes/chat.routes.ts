import { Router } from "express"
import { requireGatewayUser, validate } from "../middlewares/chat.middlewares"
import { handleCreateConversation } from "../controllers/chat.controllers"

import {
    conversationIdParamSchema,
    createConversationSchema,
    sendMessageSchema,
} from "../models/chat.zod_models"

const router = Router()

router.use(requireGatewayUser)

router.post("/conversations", validate(createConversationSchema), handleCreateConversation)
// router.get("/conversations", handleListConversations)
// router.get("/conversations/:id/messages", validate(conversationIdParamSchema, "params"), handleListMessages)
// router.post("/conversations/:id/messages", validate(conversationIdParamSchema, "params"), validate(sendMessageSchema), handleSendMessage)

export default router