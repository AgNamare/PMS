// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  const response: any = {
    success: false,
    message: isProduction ? "Internal server error" : err.message,
  };

  // Include stack trace in development
  if (!isProduction && err.stack) {
    response.stack = err.stack;
  }

  // Validation errors (from Joi or similar)
  if (err.details) {
    response.errors = err.details;
    response.message = "Validation failed";
  }

  // Prisma errors
  if (err.code?.startsWith("P")) {
    response.message = "Database error occurred";

    if (!isProduction) {
      response.prismaCode = err.code;
      response.meta = err.meta;
    }
  }

  res.status(statusCode).json(response);
};
