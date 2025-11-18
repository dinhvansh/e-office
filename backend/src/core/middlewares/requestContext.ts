import { NextFunction, Request, Response } from "express";
import { v4 as uuid } from "uuid";

export const requestContext = (req: Request, _res: Response, next: NextFunction): void => {
  req.context = {
    requestId: uuid(),
    startedAt: Date.now(),
  };
  next();
};
