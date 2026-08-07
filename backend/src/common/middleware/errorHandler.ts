import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Global Error Handler caught an issue:", err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || "An unexpected system error occurred";

  res.status(status).json({
    success: false,
    message
  });
};
