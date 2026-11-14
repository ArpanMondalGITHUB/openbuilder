import type{ ZodType } from "zod";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config/billing.config";


export class ApiError extends Error{
    constructor(public statusCode:number,message:string){
        super(message);
    }
};

// Gateway verifies JWT, sets req.user, forwards x-user-id + x-user-jti headers.
// Chat trusts these headers — the gateway is the single trust boundary.
export const requireGatewayUser = (req: Request, _res: Response, next: NextFunction) => {
    const id = req.header("x-user-id")
    if (!id) return next(new ApiError(401, "Unauthorized"));
    (req as any).user = { id, jti: req.header("x-user-jti") }
    next()
}

export const requireInternalKey = (req: Request, _res: Response, next: NextFunction) => {
    const internalKey = req.header("x-internal-key")
    // reject when the header is missing OR wrong
    if (!internalKey || internalKey !== config.internalkey) {
        return next(new ApiError(401, "Invalid internal key"))
    }
    next()
}

export const validate =
  (schema: ZodType, source: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }
    Object.assign(req[source], result.data); // keep trimmed/lowercased values
    next();
};

export const errorHandler = (
  err:unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  // pg unique-constraint violation → duplicate email race lost
  if (typeof err === "object" && err !== null && (err as any).code === "23505") {
    return res.status(409).json({ message: "Duplicate record" });
  }
  console.error(err); // real logging: swap for pino when you need it
  return res.status(500).json({ message: "Internal server error" });
};
