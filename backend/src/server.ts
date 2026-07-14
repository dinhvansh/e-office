import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";

const start = async (): Promise<void> => {
  try {
    await prisma.$connect();
    const port = Number(env.PORT);
    const server = app.listen(port, '0.0.0.0', () => {
      // eslint-disable-next-line no-console
      console.log(`Backend listening on port ${port}`);
    });

    const shutdown = (signal: string): void => {
      // eslint-disable-next-line no-console
      console.log(`Received ${signal}; shutting down gracefully`);
      server.close(() => {
        void Promise.allSettled([prisma.$disconnect(), redis.quit()]).then(() => process.exit(0));
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to start backend", err);
    process.exit(1);
  }
};

void start();
