import "dotenv/config";
import express from "express"
import cookieParser from "cookie-parser";
import { config } from "./config/agent.config";


const port = config.port


const app = express();

app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());



app.get('/', (req, res) => {
    res.json({ status: 'hllo from chat' })
});


app.listen(port, () => {
    console.log(`chat service start to listning on PORT ${port}`)
});
