import type { RunnableConfig } from "@langchain/core/runnables";
import { getmodel } from "../config/llmModels";
import { agentState } from "../graph/state";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

const BASE_PROMPT = "You are a helpful assistant.";

// When the router picked "search", the search agent runs first and leaves its
// sources in state; this turns them into grounding instructions for the answer.
const searchContext = (state: typeof agentState.State) => {
    if (state.agent !== "search") return null;

    const today = new Date().toISOString().slice(0, 10);

    if (state.searchResult.length === 0) {
        return `Today is ${today}. A web search was attempted for this question but returned nothing${
            state.searchError ? ` (${state.searchError})` : ""
        }.
Answer from your own knowledge, say clearly that you couldn't check live sources,
and note that the information may be out of date.`;
    }

    const sources = state.searchResult
        .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.content}`)
        .join("\n\n");

    return `Today is ${today}. Answer the user's question using these web search results.

Rules:
- Base the answer on the sources. If they don't answer the question, say so instead of guessing.
- Cite sources inline with their number, like [1] or [2][3].
- If sources disagree, say so and cite both.
- End with a "Sources:" list of only the sources you cited, one per line: [n] Title - URL

Search results:
${sources}`;
};

export const chatAgent = async (state: typeof agentState.State, config?: RunnableConfig) => {
    const llm = getmodel("chat");
    const grounding = searchContext(state);

    // config carries the abort signal from the controller (Stop button)
    const response = await llm.invoke(
        [
            new SystemMessage(grounding ? `${BASE_PROMPT}\n\n${grounding}` : BASE_PROMPT),
            ...state.history.map((turn) =>
                turn.role === "user" ? new HumanMessage(turn.content) : new AIMessage(turn.content)
            ),
            new HumanMessage(state.prompt),
        ],
        config
    );

    return { aiResponse: String(response.content) };
};
