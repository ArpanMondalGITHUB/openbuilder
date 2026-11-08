import type { RunnableConfig } from "@langchain/core/runnables";
import { searchTool } from "../config/tavily";
import { getmodel } from "../config/llmModels";
import { agentState, type SearchSource } from "../graph/state";

const MAX_QUERY_CHARS = 400; // Tavily rejects longer queries
const MAX_CONTENT_CHARS = 1500; // per source, keeps the chat prompt small

// "what about his net worth?" only makes sense with the history, so turn it into
// a standalone query first. With no history the prompt is already standalone.
const toSearchQuery = async (state: typeof agentState.State, config?: RunnableConfig) => {
    if (state.history.length === 0) return state.prompt;

    const recent = state.history
        .slice(-6)
        .map((t) => `${t.role}: ${t.content.slice(0, 500)}`)
        .join("\n");

    try {
        const llm = getmodel("search");
        const res = await llm.invoke(
            `Rewrite the user's latest message as a standalone web search query.
Use the conversation only to resolve references (he, it, that company...).
Reply with the query only — no quotes, no explanation.

Conversation:
${recent}

Latest message: ${state.prompt}`,
            config
        );
        const query = String(res.content).trim();
        return query || state.prompt;
    } catch (error) {
        if (config?.signal?.aborted) throw error; // Stop pressed — don't keep going
        return state.prompt;
    }
};

// Only fetches sources; the chat agent (next node) writes the answer from them.
// Returns just the fields it owns — returning ...state would re-append history
// through its concat reducer.
export const searchAgent = async (state: typeof agentState.State, config?: RunnableConfig) => {
    const query = (await toSearchQuery(state, config)).slice(0, MAX_QUERY_CHARS);

    const raw = (await searchTool.invoke({ query }, config)) as {
        results?: { title?: string; url?: string; content?: string }[];
        images?: (string | { url?: string })[];
        error?: string;
    };

    // the tool doesn't throw: failures and "no results" come back as { error }
    if (!raw || raw.error || !Array.isArray(raw.results)) {
        console.error("search failed:", raw?.error ?? "unexpected response");
        return { searchResult: [], images: [], searchError: raw?.error ?? "Search failed" };
    }

    const searchResult: SearchSource[] = raw.results
        .filter((r) => r.url && r.content)
        .map((r) => ({
            title: r.title?.trim() || r.url!,
            url: r.url!,
            content: r.content!.slice(0, MAX_CONTENT_CHARS),
        }));

    // images are plain URLs, or { url, description } when descriptions are on
    const images = (raw.images ?? [])
        .map((img) => (typeof img === "string" ? img : img?.url))
        .filter((url): url is string => Boolean(url));

    return { searchResult, images, searchError: null };
};
