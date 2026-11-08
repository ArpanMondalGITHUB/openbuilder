import { Router } from "express"
import { requireGatewayUser, validate } from "../middlewares/chat.middlewares"
import {
    handleCancelMessage,
    handleCreateConversation,
    handleGetConversation,
    handleGetMessage,
    handleSaveMessage,
    handleUpdateConversation,
} from "../controllers/chat.controllers"

import {
    cancelMessageParamSchema,
    conversationIdParamSchema,
    createConversationSchema,
    saveMessageSchema,
    updateConversationSchema,
} from "../models/chat.zod_models"

const router = Router()

router.use(requireGatewayUser)

router.post("/conversations", validate(createConversationSchema), handleCreateConversation)
router.get("/conversations", handleGetConversation)
router.get("/conversations/:conversationId/messages", validate(conversationIdParamSchema, "params"), handleGetMessage)
router.post("/conversations/:conversationId/messages", validate(conversationIdParamSchema, "params"), validate(saveMessageSchema), handleSaveMessage)
// Stop button: marks the attempt cancelled and aborts the agent run
router.post("/conversations/:conversationId/messages/:requestId/cancel", validate(cancelMessageParamSchema, "params"), handleCancelMessage)
router.patch("/conversations/:conversationId", validate(conversationIdParamSchema, "params"), validate(updateConversationSchema), handleUpdateConversation)

export default router
