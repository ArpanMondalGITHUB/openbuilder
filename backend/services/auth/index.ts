import "dotenv/config";
import express from "express"
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import { errorHandler } from "./middlewares/auth.middlewares";
import { config } from "./config/auth.config";

const port = config.port


const app = express();

app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());


app.use('/api/v1/auth',authRoutes)

app.get('/', (req, res) => {
    res.json({ status: 'hllo from auth' })
});

app.use(errorHandler);

app.listen(port, () => {
    console.log(`auth start to listning on PORT ${port}`)
});
