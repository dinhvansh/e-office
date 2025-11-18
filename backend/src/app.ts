import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler } from "./core/middlewares/errorHandler";
import { requestContext } from "./core/middlewares/requestContext";
import { v1Router } from "./router/v1";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN ?? "*",
    credentials: true,
  }),
);
app.use(express.json({ limit: "25mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(requestContext);

app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.use("/api/v1", v1Router);
app.use(errorHandler);
