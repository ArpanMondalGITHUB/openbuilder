import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
dotenv.config();

const port = Number(process.env.PORT ?? 8001)


const app = express();

app.use(express.json());
app.use(cookieParser());


app.use('/api/v1/auth',authRoutes)

app.get('/', (req, res) => {
    res.json({ status: 'hllo from auth' })
});

app.listen(port, () => {
    console.log(`gateway start to listning on PORT ${port}`)
});