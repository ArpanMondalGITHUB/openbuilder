import { config } from "../config/chat.config";
import { ApiError } from "../middlewares/chat.middlewares";
import axios from "axios";
// How chat talks to the agent service.
export const callAgent = async (
    conversationId: string,
    userId: string,
    prompt: string,
    history: { role: string; content: string }[],
    requestId: string
) => {
    const {data} = await axios.post(`${config.agentServiceUrl}/api/v1/agent/conversations/${conversationId}`,
        {prompt, history},
        {
            headers:{
                "x-user-id": userId,
                "idempotency-key": requestId,   // ← the agent needs it to complete the attempt
            },
            timeout: 60_000,
        }
    );

    if (!data) throw new ApiError(502, "Agent service failed");

    // the agent hands back the row it saved — no need to re-read the transcript
    const { result, assistantMessage } = data;
    return { aiResponse: result?.aiResponse as string, assistantMessage };
};
