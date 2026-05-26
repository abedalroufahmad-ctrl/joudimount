import type { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";

export const validate = (schema: AnyZodObject) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.flatten() });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  };