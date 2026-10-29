import type { NextFunction, Request, Response } from "express"
import { graph } from "../graph/graph"
import { ApiError } from "../middlewares/agent.middlewares"

export const handleInvokeGraph = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { prompt } = req.body
        if (!prompt) throw new ApiError(400, "Prompt is required")

        const result = await graph.invoke({ prompt })

        res.json({ result })
    } catch (error) {
        next(error)
    }
}
