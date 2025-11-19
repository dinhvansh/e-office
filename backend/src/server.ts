import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

const start = async (): Promise<void> => {
  try {
    await prisma.$connect();
    const port = Number(env.PORT);
    app.listen(port, '0.0.0.0', () => {
      // eslint-disable-next-line no-console
      console.log(`Backend listening on port ${port}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to start backend", err);
    process.exit(1);
  }
};

void start();
