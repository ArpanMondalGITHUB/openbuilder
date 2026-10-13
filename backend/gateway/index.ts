import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import cookieParser from "cookie-parser"
import morgan from "morgan"
import proxy from "express-http-proxy"
dotenv.config()

const port = Number(process.env.PORT ?? 8000)
const authServiceUrl = process.env.AUTH_SERVICE

if (!authServiceUrl) {
  throw new Error("AUTH_SERVICE is not defined. Add it to your .env")
}

const app = express();

app.use(cookieParser());

app.use(cors({
    origin:process.env.FRONTEND_URL,
    credentials:true,
}));
app.use(morgan("dev"));

app.use("/api/v1/auth", proxy(authServiceUrl,{
    proxyReqPathResolver: (req) => `/api/v1/auth${req.url}`,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        const forwardedFor = srcReq.headers["x-forwarded-for"]
        const chain = Array.isArray(forwardedFor) ? forwardedFor.join(", ") : forwardedFor
        const clientIp = srcReq.socket.remoteAddress
        proxyReqOpts.headers["x-forwarded-for"] = [chain, clientIp].filter(Boolean).join(", ")
        return proxyReqOpts
    },
}));

app.get('/', (req, res) => {
    res.json({ status: 'ok' })
});

app.listen(port, () => {
    console.log(`gateway start to listning on PORT ${port}`)
});
