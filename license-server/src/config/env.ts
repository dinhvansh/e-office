import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000"),
  LICENSE_SIGNING_SECRET: z.string().min(1, "LICENSE_SIGNING_SECRET is required"),
});

export type LicenseEnv = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
