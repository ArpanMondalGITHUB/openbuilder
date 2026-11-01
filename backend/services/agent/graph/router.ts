import { getmodel } from "../config/llmModels";
import { AGENT_NAMES, AgentName, agentState } from "./state";

const ROUTER_PROMPT = `You are a router. Pick exactly one agent to handle the user's request.

Agents:
- chat: general conversation, explanations, opinions, greetings — anything that doesn't fit below
- search: questions needing current or factual web information — lookups, news, people, dates, "latest", "who is"
- coding: writing, debugging, explaining, or refactoring code in any language
- pdf: producing document or report content
- ppt: slide decks, presentations, slide outlines
- imageGen: creating images, pictures, illustrations, logos, visual design

Rules:
- Reply with the agent name only. No punctuation, no quotes, no explanation.
- If several could apply, pick the one matching the primary deliverable.
- If none clearly applies, reply "chat".`;

export const router = async (state: typeof agentState.State) => {
    const llm = getmodel("router");

    const response = await llm.invoke(`${ROUTER_PROMPT}\n\nRequest: ${state.prompt}`);

    const answer = String(response.content).trim().toLowerCase();
    const matched = AGENT_NAMES.find((name) => answer.includes(name.toLowerCase()));
    console.log(matched)
    return { agent: (matched ?? "chat") as AgentName };
};
