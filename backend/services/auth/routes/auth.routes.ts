import { Router } from "express";
import {
    signup,
    signin,
    logout,
    refresh,
    getMe,
} from "../controllers/auth.controllers";
import { 
    requireAuth,
    validate ,
    authLimiter
} from "../middlewares/auth.middlewares";
import { 
    signinSchema,
    signupSchema,
} from "../models/auth.zod_models";

const router = Router()

router.route("/signup").post(authLimiter,validate(signupSchema), signup);
router.route("/signin").post(authLimiter,validate(signinSchema),signin);
router.route("/refresh-token").post(authLimiter,refresh);
router.route("/logout").post(logout);
router.route("/me")
      .get(requireAuth, getMe)


export default router;