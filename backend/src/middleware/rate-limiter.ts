import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';
import { env } from '../config/env';
import crypto from 'node:crypto';

const authRateLimitBypassEmails = new Set(
  (env.RATE_LIMIT_BYPASS_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

const shouldSkipAuthRateLimit = (req: Request): boolean => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return email !== '' && authRateLimitBypassEmails.has(email);
};

const getNormalizedEmail = (req: Request): string => {
  return typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
};

const authKeyGenerator = (req: Request): string => {
  const email = getNormalizedEmail(req);
  const ip = ipKeyGenerator(req.ip || 'unknown');
  return email ? `${ip}:${email}` : ip;
};

// Rate limiter for authentication endpoints
export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: {
      message: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.',
      code: 'TOO_MANY_REQUESTS',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: authKeyGenerator,
  skip: shouldSkipAuthRateLimit,
});

export const authRefreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  message: {
    success: false,
    error: {
      message: 'Quá nhiều lần làm mới phiên đăng nhập. Vui lòng thử lại sau.',
      code: 'TOO_MANY_REQUESTS',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip || 'unknown'),
});

// Rate limiter for general API endpoints
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      message: 'Quá nhiều requests. Vui lòng thử lại sau.',
      code: 'TOO_MANY_REQUESTS',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  message: {
    success: false,
    error: {
      message: 'Quá nhiều lần thử. Vui lòng thử lại sau 1 giờ.',
      code: 'TOO_MANY_REQUESTS',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for OTP resend endpoint exposed publicly
export const publicSendOtpIpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: { message: "Too many OTP requests. Please try again later.", code: "OTP_SEND_RATE_LIMITED" },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip || 'unknown'),
});

export const publicSendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: {
    success: false,
    error: {
      message: "Too many OTP resend attempts. Please try again later.",
      code: "OTP_SEND_RATE_LIMITED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => crypto.createHash('sha256').update(String(req.params.token || '')).digest('hex'),
});

// Rate limiter for OTP verification endpoint exposed publicly
export const publicVerifyOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: {
    success: false,
    error: {
      message: "Too many OTP verification attempts. Please try again later.",
      code: "OTP_VERIFY_RATE_LIMITED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
