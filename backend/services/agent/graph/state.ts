import { Annotation } from "@langchain/langgraph";
import { ChatTurn } from "../models/agent.zod_models";
import type { StoredFile } from "../services/storage";

export const AGENT_NAMES = ["chat", "search", "coding", "pdf", "ppt", "imageGen"] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

// one web result handed from the search agent to the chat agent
export interface SearchSource {
    title: string;
    url: string;
    content: string;
}

export const agentState = Annotation.Root({
    prompt: Annotation<string>(),
    conversationId: Annotation<string>(),
    // owner of the run; prefixes S3 keys so downloads can be ownership-checked
    userId: Annotation<string>(),
    // concat reducer, otherwise each node's write replaces the array
    history: Annotation<ChatTurn[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
    aiResponse: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
    agent: Annotation<AgentName>({ reducer: (_, next) => next, default: () => "chat" }),
    // filled by the search agent, read by the chat agent (search → chat edge)
    searchResult: Annotation<SearchSource[]>({ reducer: (_, next) => next, default: () => [] }),
    searchError: Annotation<string | null>({ reducer: (_, next) => next, default: () => null }),
    images: Annotation<string[]>({ reducer: (_, next) => next, default: () => [] }),
    // files the pdf / ppt / imageGen agents uploaded to S3
    files: Annotation<StoredFile[]>({ reducer: (_, next) => next, default: () => [] }),
});

export type AgentState = typeof agentState.State;
