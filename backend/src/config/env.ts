import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const knownWeakSecrets = new Set([
  "change-me",
  "secret",
  "secret123",
  "password123",
  "jwt-secret",
  "refresh-secret",
]);

const strongSecret = (name: string) =>
  z.string()
    .min(32, `${name} must be at least 32 characters for security`)
    .refine((value) => {
      const normalized = value.trim().toLowerCase();
      return !knownWeakSecrets.has(normalized) && !normalized.includes("generate_a_long_random") && !normalized.includes("replace-with");
    }, `${name} must not use a known placeholder or weak secret`);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("4000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: strongSecret("JWT_SECRET"),
  REFRESH_TOKEN_SECRET: strongSecret("REFRESH_TOKEN_SECRET"),
  TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  LICENSE_SERVER_URL: z.string().default("http://license-server:5000"),
  CORS_ORIGIN: z.string().optional(),
  STORAGE_BUCKET: z.string().default("local"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_BASE_PATH: z.string().default("./storage"),
  // Email configuration
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.string().default("587"),
  SMTP_SECURE: z.string().default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default("noreply@wpsign.local"),
  EMAIL_FROM_NAME: z.string().default("WP Sign"),
  AUTH_COOKIE_NAME: z.string().default("esign_rt"),
  AUTH_COOKIE_SECURE: z.string().default("false"),
  AUTH_COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  DISABLE_LICENSE_CHECK: z.string().default("false"),
  RATE_LIMIT_BYPASS_EMAILS: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(process.env);
