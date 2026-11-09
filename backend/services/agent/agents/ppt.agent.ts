import PptxGenJS from "pptxgenjs";
import { z } from "zod";
import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getmodel } from "../config/llmModels";
import { agentState } from "../graph/state";
import { publishGeneratedFile } from "../services/storage";
import { toMessages } from "./history";

const deckSchema = z.object({
    title: z.string().describe("Deck title for the cover slide"),
    subtitle: z.string().describe("Cover subtitle; empty string if none"),
    slides: z
        .array(
            z.object({
                title: z.string(),
                bullets: z.array(z.string()).describe("3-6 concise bullet points, plain text"),
                notes: z.string().describe("Speaker notes for this slide; empty string if none"),
            })
        )
        .min(1)
        .max(20),
});
type Deck = z.infer<typeof deckSchema>;

const PPT_PROMPT = `You create presentation slide decks.
- Default to 6-10 content slides unless the user asks for a specific number.
- Each slide: a short title and 3-6 concise bullets (under ~15 words each). Put detail in the speaker notes.
- Plain text only: no markdown symbols in any field.`;

const ACCENT = "2F5597";

const renderDeck = async (deck: Deck): Promise<Buffer> => {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
    pptx.title = deck.title;

    const cover = pptx.addSlide();
    cover.background = { color: ACCENT };
    cover.addText(deck.title, { x: 0.8, y: 2.4, w: 11.7, h: 1.4, fontSize: 40, bold: true, color: "FFFFFF" });
    if (deck.subtitle) {
        cover.addText(deck.subtitle, { x: 0.8, y: 3.9, w: 11.7, h: 0.8, fontSize: 20, color: "DDE6F5" });
    }

    for (const s of deck.slides) {
        const slide = pptx.addSlide();
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.15, fill: { color: ACCENT } });
        slide.addText(s.title, { x: 0.6, y: 0.4, w: 12.1, h: 1, fontSize: 30, bold: true, color: ACCENT });
        slide.addText(
            s.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
            { x: 0.8, y: 1.6, w: 11.7, h: 5.3, fontSize: 20, color: "333333", valign: "top", paraSpaceAfter: 10 }
        );
        if (s.notes) slide.addNotes(s.notes);
    }

    return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
};

export const pptAgent = async (state: typeof agentState.State, config?: RunnableConfig) => {
    const llm = getmodel("ppt").withStructuredOutput(deckSchema);
    const deck = (await llm.invoke(
        [new SystemMessage(PPT_PROMPT), ...toMessages(state.history), new HumanMessage(state.prompt)],
        config
    )) as Deck | null | undefined;
    // withStructuredOutput returns nothing (instead of throwing) when the model's JSON is missing or invalid.
    if (!deck?.title || !Array.isArray(deck.slides)) {
        throw new Error("PPT model did not return a valid deck (structured output failed)");
    }

    const buffer = await renderDeck(deck);
    if (config?.signal?.aborted) throw new Error("Aborted");

    const { file, url } = await publishGeneratedFile(state, buffer, {
        title: deck.title,
        extension: "pptx",
        contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    const outline = deck.slides.map((s, i) => `${i + 1}. ${s.title}`).join("\n");
    return {
        aiResponse: `Here's your presentation (${deck.slides.length + 1} slides): **[${file.name}](${url})**\n\n${outline}`,
        files: [file],
    };
};
