import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../errors/api-error";

interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
    requestId?: string;
  };
}

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  void _next;
  if (err instanceof ApiError) {
    const payload: ApiErrorResponse = {
      success: false,
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
        requestId: req.context?.requestId,
      },
    };
    res.status(err.statusCode).json(payload);
    return;
  }

  if (err instanceof ZodError) {
    const payload: ApiErrorResponse = {
      success: false,
      error: {
        message: "Invalid request data",
        code: "VALIDATION_ERROR",
        details: err.issues.map((issue) => ({
          code: issue.code,
          path: issue.path,
          message: issue.message,
        })),
        requestId: req.context?.requestId,
      },
    };
    res.status(400).json(payload);
    return;
  }

  const payload: ApiErrorResponse = {
    success: false,
    error: {
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      requestId: req.context?.requestId,
    },
  };
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json(payload);
};
