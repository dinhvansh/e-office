import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const knownWeakSecrets = new Set([
  "change-me",
  "secret",
  "secret123",
  "password123",
  "license-secret",
]);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000"),
  LICENSE_SIGNING_SECRET: z.string()
    .min(32, "LICENSE_SIGNING_SECRET must be at least 32 characters for security")
    .refine((value) => {
      const normalized = value.trim().toLowerCase();
      return !knownWeakSecrets.has(normalized) && !normalized.includes("generate_a_long_random") && !normalized.includes("replace-with");
    }, "LICENSE_SIGNING_SECRET must not use a known placeholder or weak secret"),
});

export type LicenseEnv = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
