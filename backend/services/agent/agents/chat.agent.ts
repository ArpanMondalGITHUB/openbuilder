import { getmodel } from "../config/llmModels";
import { agentState } from "../graph/state";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
export const chatAgent = async (state: typeof agentState.State) => {
    const llm = getmodel("chat");
    const response = await llm.invoke([
            new SystemMessage("You are a helpful assistant."),
            new HumanMessage(state.prompt),
        ]);

    return { aiResponse: String(response.content) };
};
