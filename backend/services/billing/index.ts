import "dotenv/config";
import { config } from "./config/billing.config";
import { app } from "./app";

app.listen(config.port, () => {
    console.log(`billing service listening on PORT ${config.port}`);
});
