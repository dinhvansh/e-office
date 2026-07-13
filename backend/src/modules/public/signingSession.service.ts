import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export const SIGNING_SESSION_COOKIE = "esign_signing_session";
export const PUBLIC_SIGNING_COOKIE_PATH = "/public/sign";
const SIGNING_SESSION_TTL_SECONDS = 15 * 60;

export type SigningSessionClaims = {
  signerId: number;
  signRequestId: number;
  otpFingerprint: string;
  purpose: "external_signing";
};

export function createSigningSession(signerId: number, signRequestId: number, otpFingerprint: string): string {
  return jwt.sign(
    { signerId, signRequestId, otpFingerprint, purpose: "external_signing" } satisfies SigningSessionClaims,
    env.JWT_SECRET,
    { expiresIn: SIGNING_SESSION_TTL_SECONDS },
  );
}

export function isSigningSessionValid(
  token: string | undefined,
  signerId: number,
  signRequestId: number,
  otpFingerprint: string | null,
): boolean {
  if (!token) return false;
  try {
    const claims = jwt.verify(token, env.JWT_SECRET) as SigningSessionClaims;
    return claims.purpose === "external_signing"
      && claims.signerId === signerId
      && claims.signRequestId === signRequestId
      && otpFingerprint !== null
      && claims.otpFingerprint === otpFingerprint;
  } catch {
    return false;
  }
}

export function getSigningSessionErrorCode(
  token: string | undefined,
): "SIGNING_SESSION_INVALID" | "SIGNING_SESSION_EXPIRED" {
  if (!token) return "SIGNING_SESSION_INVALID";
  try {
    jwt.verify(token, env.JWT_SECRET);
    return "SIGNING_SESSION_INVALID";
  } catch (error) {
    return error instanceof jwt.TokenExpiredError ? "SIGNING_SESSION_EXPIRED" : "SIGNING_SESSION_INVALID";
  }
}

export { SIGNING_SESSION_TTL_SECONDS };
