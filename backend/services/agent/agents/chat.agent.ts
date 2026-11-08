import type { RunnableConfig } from "@langchain/core/runnables";
import { getmodel } from "../config/llmModels";
import { agentState } from "../graph/state";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
export const chatAgent = async (state: typeof agentState.State, config?: RunnableConfig) => {
    const llm = getmodel("chat");
    // config carries the abort signal from the controller (Stop button)
    const response = await llm.invoke([
            new SystemMessage("You are a helpful assistant."),
            ...state.history.map((turn) =>
                turn.role === "user" ? new HumanMessage(turn.content) : new AIMessage(turn.content)
            ),
            new HumanMessage(state.prompt),
        ], config);

    return { aiResponse: String(response.content) };
};
