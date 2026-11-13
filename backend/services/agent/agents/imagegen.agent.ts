import type { RunnableConfig } from "@langchain/core/runnables";
import { config as appConfig } from "../config/agent.config";
import { agentState } from "../graph/state";
import { publishGeneratedFile } from "../services/storage";

// @google/genai is ESM-only and this service is CommonJS, so it's loaded with a dynamic import
type GenAI = typeof import("@google/genai", { with: { "resolution-mode": "import" } });
let sdk: Promise<{ client: InstanceType<GenAI["GoogleGenAI"]>; Modality: GenAI["Modality"] }> | null = null;
const getSdk = () => {
    if (!appConfig.googleApiKey) throw new Error("GOOGLE_API_KEY is not set");
    sdk ??= import("@google/genai").then(({ GoogleGenAI, Modality }) => ({
        client: new GoogleGenAI({ apiKey: appConfig.googleApiKey }),
        Modality,
    }));
    return sdk;
};

const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

// "now make it blue" only makes sense with the earlier request, so pass a little context
const buildPrompt = (state: typeof agentState.State) => {
    const recentUserTurns = state.history.filter((t) => t.role === "user").slice(-3);
    if (!recentUserTurns.length) return state.prompt;
    const context = recentUserTurns.map((t) => `- ${t.content.slice(0, 300)}`).join("\n");
    return `Earlier requests in this conversation (context only):\n${context}\n\nGenerate this image: ${state.prompt}`;
};

export const imagGenAgent = async (state: typeof agentState.State, config?: RunnableConfig) => {
    const { client, Modality } = await getSdk();
    const res = await client.models.generateContent({
        model: appConfig.imageModel,
        contents: buildPrompt(state),
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE], abortSignal: config?.signal },
    });

    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const image = parts.find((p) => p.inlineData?.data);
    const caption = parts.map((p) => p.text ?? "").join("").trim();

    if (!image?.inlineData?.data) {
        // usually a safety block, or the model replying with text only
        return {
            aiResponse: caption || "I couldn't generate an image for that request. Try rephrasing it.",
            files: [],
        };
    }
    if (config?.signal?.aborted) throw new Error("Aborted");

    const contentType = image.inlineData.mimeType ?? "image/png";
    const { file, url } = await publishGeneratedFile(state, Buffer.from(image.inlineData.data, "base64"), {
        title: state.prompt.slice(0, 60),
        extension: EXTENSIONS[contentType] ?? "png",
        contentType,
        inline: true, // lets <img> display it instead of forcing a download
    });

    const alt = state.prompt.slice(0, 100).replace(/[[\]\n]/g, " ");
    return { aiResponse: `![${alt}](${url})${caption ? `\n\n${caption}` : ""}`, files: [file] };
};
