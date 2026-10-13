import type { Request, Response, NextFunction } from "express"
import type { ZodType } from "zod"

export class ApiError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message)
    }
}

// Gateway verifies JWT and attaches x-user-id; chat trusts this header.
export const requireUser = (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.headers["x-user-id"]
    if (!userId || typeof userId !== "string") {
        return next(new ApiError(401, "Not authorized"))
    }
    ;(req as any).userId = userId
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
        Object.assign(req[source], result.data) // keep trimmed/normalized values
        next()
    }

export const errorHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ message: err.message })
    }
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
}