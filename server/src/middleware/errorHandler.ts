import type { ErrorRequestHandler } from "express";
import { env } from "../config/env.js";

export class HttpError extends Error {
  readonly statusCode: number;
  readonly expose: boolean;

  constructor(statusCode: number, message: string, expose = true) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.expose = expose;
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode =
    err instanceof HttpError ? err.statusCode : typeof err.status === "number" ? err.status : 500;

  const exposeMessage =
    err instanceof HttpError
      ? err.expose
      : env.NODE_ENV !== "production";

  const message =
    statusCode === 500 && !exposeMessage
      ? "Internal server error"
      : typeof err.message === "string" && err.message.length > 0
        ? err.message
        : "Error";

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    ok: false,
    error: {
      code: statusCode === 500 ? "internal_error" : "request_error",
      message,
    },
  });
};
