import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { router } from "./router";

export const app = express();

app.use(
  cors({
    origin: "*",
  }),
);
app.use(helmet());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ success: true, data: { service: "license-server", status: "ok" } });
});

app.use("/api/v1", router);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({
    success: false,
    error: {
      message: err instanceof Error ? err.message : "Internal server error",
    },
  });
});
