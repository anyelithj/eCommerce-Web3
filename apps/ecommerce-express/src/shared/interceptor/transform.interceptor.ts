import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { PaginationMeta } from "../types/pagination.types";
import { HttpStatus, type SuccessStatus } from "../constants/http.constants";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  status: SuccessStatus = HttpStatus.OK,
  meta?: PaginationMeta
): void {
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function sendNoContent(res: Response): void {
  res.status(HttpStatus.NO_CONTENT).send();
}
