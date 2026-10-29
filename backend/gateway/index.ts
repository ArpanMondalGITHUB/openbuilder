import "dotenv/config"
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import morgan from "morgan"
import proxy from "express-http-proxy"
import { config } from "./config/gateway.config"
import { verifyAccessToken, errorHandler } from "./middlewares/gateway.middlewares"
import { forwardUserHeaders } from "./utills/proxyHeaders"

const app = express()

app.use(cookieParser())
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}))
app.use(morgan("dev"))

app.use("/api/v1/auth", proxy(config.authServiceUrl, {
    proxyReqPathResolver: (req) => `/api/v1/auth${req.url}`,
    proxyReqOptDecorator: forwardUserHeaders,
}))

app.use("/api/v1/chat", verifyAccessToken, proxy(config.chatServiceUrl, {
    proxyReqPathResolver: (req) => `/api/v1/chat${req.url}`,
    proxyReqOptDecorator: forwardUserHeaders,
}))

app.use("/api/v1/agent", proxy(config.agentServiceUrl, {
    proxyReqPathResolver: (req) => `/api/v1/agent${req.url}`
}))

app.get('/', (_req, res) => {
    res.json({ status: 'ok' })
})

app.use(errorHandler)

app.listen(config.port, () => {
    console.log(`gateway start to listning on PORT ${config.port}`)
})