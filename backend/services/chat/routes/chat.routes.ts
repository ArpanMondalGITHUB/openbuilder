import { Router } from "express"
import { requireGatewayUser, validate } from "../middlewares/chat.middlewares"
import {
    handleCreateConversation,
    handleGetConversation,
    handleGetMessage,
    handleSaveMessage,
} from "../controllers/chat.controllers"

import {
    conversationIdParamSchema,
    createConversationSchema,
    saveMessageSchema,
} from "../models/chat.zod_models"

const router = Router()

router.use(requireGatewayUser)

router.post("/conversations", validate(createConversationSchema), handleCreateConversation)
router.get("/conversations", handleGetConversation)
router.get("/conversations/:conversationId/messages", validate(conversationIdParamSchema, "params"), handleGetMessage)
router.post("/conversations/:conversationId/messages", validate(conversationIdParamSchema, "params"), validate(saveMessageSchema), handleSaveMessage)

export default router
