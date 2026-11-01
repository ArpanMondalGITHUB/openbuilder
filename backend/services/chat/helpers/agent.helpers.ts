import { config } from "../config/chat.config";
import { ApiError } from "../middlewares/chat.middlewares";
import axios from "axios";
// How chat talks to the agent service.
export const callAgent = async (conversationId: string, userId: string, prompt: string) => {
    const {data} = await axios.post(`${config.agentServiceUrl}/api/v1/agent/conversations/${conversationId}`,
        {prompt},
        {
            headers:{ "x-user-id": userId},
            timeout: 60_000,
        }
    );

    if (!data) throw new ApiError(502, "Agent service failed");

    const { result } = data;
    return result?.aiResponse as string;
};
