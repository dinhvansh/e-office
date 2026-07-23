import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Preserve the former spelling for deployments that already configured it.
if (!process.env.FILE_STORAGE_DRIVER && process.env.STORAGE_DRIVER) {
  process.env.FILE_STORAGE_DRIVER = process.env.STORAGE_DRIVER;
}

const knownWeakSecrets = new Set([
  "change-me",
  "secret",
  "secret123",
  "password123",
  "jwt-secret",
  "refresh-secret",
  "license-secret",
]);

const strongSecret = (name: string) =>
  z.string()
    .min(32, `${name} must be at least 32 characters for security`)
    .refine((value) => {
      const normalized = value.trim().toLowerCase();
      return !knownWeakSecrets.has(normalized)
        && !normalized.includes("generate_a_long_random")
        && !normalized.includes("replace-me")
        && !normalized.includes("replace-with")
        && !normalized.includes("your-secret");
    }, `${name} must not use a known placeholder or weak secret`);

const optionalNonEmptyString = () => z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().min(1).optional(),
);
const optionalUrl = () => z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().url().optional(),
);

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
  APP_BASE_URL: z.string().url().optional(),
  STORAGE_BUCKET: z.string().default("local"),
  FILE_STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  // Deprecated alias retained only for existing local deployments. New config
  // must use FILE_STORAGE_DRIVER.
  STORAGE_DRIVER: z.enum(["local", "s3"]).optional(),
  STORAGE_BASE_PATH: z.string().default("./storage"),
  S3_ENDPOINT: optionalUrl(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: optionalNonEmptyString(),
  S3_ACCESS_KEY_ID: optionalNonEmptyString(),
  S3_SECRET_ACCESS_KEY: optionalNonEmptyString(),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true"),
  // Email configuration
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.string().default("587"),
  SMTP_SECURE: z.string().default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_ENABLED: z.enum(["true", "false"]).default("false"),
  EMAIL_FROM: z.string().default("noreply@eoffice.local"),
  EMAIL_FROM_NAME: z.string().default("E-Office"),
  AUTH_COOKIE_NAME: z.string().default("esign_rt"),
  AUTH_COOKIE_SECURE: z.string().default("false"),
  AUTH_COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  DISABLE_LICENSE_CHECK: z.string().default("false"),
  RATE_LIMIT_BYPASS_EMAILS: z.string().optional(),
  INTERNAL_PROVISIONING_KEY: optionalNonEmptyString(),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV !== "production") return;

  if (!value.CORS_ORIGIN?.trim() || value.CORS_ORIGIN.split(",").some((origin) => !origin.trim() || origin.trim() === "*")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["CORS_ORIGIN"], message: "CORS_ORIGIN must be an explicit, non-wildcard origin in production" });
  }

  if (!value.APP_BASE_URL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["APP_BASE_URL"], message: "APP_BASE_URL is required in production" });
  }

  if (value.SMTP_ENABLED === "true" && (!value.SMTP_HOST || !value.SMTP_USER || !value.SMTP_PASSWORD || !value.EMAIL_FROM)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["SMTP_ENABLED"], message: "SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM are required when SMTP_ENABLED=true" });
  }

  if (value.RATE_LIMIT_BYPASS_EMAILS?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["RATE_LIMIT_BYPASS_EMAILS"], message: "RATE_LIMIT_BYPASS_EMAILS must be empty in production" });
  }
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(process.env);
