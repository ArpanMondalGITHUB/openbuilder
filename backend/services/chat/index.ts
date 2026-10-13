import "dotenv/config";
import express from "express"
import cookieParser from "cookie-parser";
import { config } from "./config/chat.config";
import { errorHandler } from "./middlewares/chat.middlewares";
// import chatRouter from "./routes/chat.routes";

const port = config.port


const app = express();

app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());



app.get('/', (req, res) => {
    res.json({ status: 'hllo from chat' })
});

// app.use("/api/v1/chat", chatRouter);
app.use(errorHandler);

app.listen(port, () => {
    console.log(`chat service start to listning on PORT ${port}`)
});
