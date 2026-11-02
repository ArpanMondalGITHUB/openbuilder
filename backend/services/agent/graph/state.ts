import { Annotation } from "@langchain/langgraph";
import { ChatTurn } from "../models/agent.zod_models";

export const AGENT_NAMES = ["chat", "search", "coding", "pdf", "ppt", "imageGen"] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

export const agentState = Annotation.Root({
    prompt: Annotation<string>(),
    conversationId: Annotation<string>(),
    // concat reducer, otherwise each node's write replaces the array
    history: Annotation<ChatTurn[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
    aiResponse: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
    agent: Annotation<AgentName>({ reducer: (_, next) => next, default: () => "chat" }),
});

export type AgentState = typeof agentState.State;
