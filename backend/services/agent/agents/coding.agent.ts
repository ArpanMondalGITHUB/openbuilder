import type { RunnableConfig } from "@langchain/core/runnables";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getmodel } from "../config/llmModels";
import { agentState } from "../graph/state";

// The web app turns every fenced block into a file in the artifact panel,
// using the path written after the language tag.
const CODING_PROMPT = `You are an expert software engineer.

Formatting rules (the UI depends on them):
- Put every file in its own fenced code block. After the language tag, write the file path:
  \`\`\`tsx src/components/ProfileCard.tsx
  \`\`\`css src/styles/card.css
- Use real, conventional paths and file names. Never put two files in one block.
- Shell commands (installs, run steps) go in a \`\`\`bash block without a path.
- When asked for UI (a card, form, component, page), prefer a single self-contained file:
  React + TypeScript with \`export default function\`, styled with Tailwind classes.
- Keep the explanation short and put it before the code. After the code, add at most a few lines on how to use it.`;

export const codingAgent = async (state: typeof agentState.State, config?: RunnableConfig) => {
    const llm = getmodel("coding");
    // passing config forwards the abort signal, so Stop cancels the LLM request itself
    const response = await llm.invoke(
        [
            new SystemMessage(CODING_PROMPT),
            ...state.history.map((turn) =>
                turn.role === "user" ? new HumanMessage(turn.content) : new AIMessage(turn.content)
            ),
            new HumanMessage(state.prompt),
        ],
        config
    );

    return { aiResponse: String(response.content) };
};
