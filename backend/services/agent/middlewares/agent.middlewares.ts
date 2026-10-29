import type { Request, Response, NextFunction } from "express"
import type { ZodType } from "zod"

export class ApiError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message)
    }
}

// Gateway verifies JWT, sets req.user, forwards x-user-id + x-user-jti headers.
// Agent trusts these headers — the gateway is the single trust boundary.
export const requireGatewayUser = (req: Request, _res: Response, next: NextFunction) => {
    const id = req.header("x-user-id")
    if (!id) return next(new ApiError(401, "Unauthorized"))
    ;(req as any).user = { id, jti: req.header("x-user-jti") }
    next()
}

export const validate = (schema: ZodType, source: "body" | "query" | "params" = "body") =>
    (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req[source])
        if (!result.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: result.error.issues.map((i) => ({
                    field: i.path.join("."),
                    message: i.message,
                })),
            })
        }
        Object.assign(req[source], result.data)
        next()
    }

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ message: err.message })
    }
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
}
