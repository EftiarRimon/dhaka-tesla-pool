import { app } from "./app";
import { config } from "./config";
import { log } from "./logger";

if (config.JWT_SECRET === "change-me") {
  log("warn", "JWT_SECRET is the default value. Set a long random one before exposing this API.");
}

app.listen(config.PORT, () => {
  log("info", "API listening", { port: config.PORT });
});