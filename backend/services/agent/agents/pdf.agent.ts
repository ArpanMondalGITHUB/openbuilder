import PDFDocument from "pdfkit";
import { z } from "zod";
import type { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getmodel } from "../config/llmModels";
import { agentState } from "../graph/state";
import { publishGeneratedFile } from "../services/storage";
import { toMessages } from "./history";

const documentSchema = z.object({
    title: z.string().describe("Document title"),
    subtitle: z.string().describe("One-line subtitle or summary; empty string if none"),
    sections: z
        .array(
            z.object({
                heading: z.string(),
                paragraphs: z.array(z.string()).describe("Body paragraphs, plain text, no markdown"),
                bullets: z.array(z.string()).describe("Bullet points shown after the paragraphs; may be empty"),
            })
        )
        .min(1),
});
type DocumentContent = z.infer<typeof documentSchema>;

const PDF_PROMPT = `You write well-structured documents and reports that will be rendered to PDF.
- Write complete, substantive content, not an outline or placeholders.
- Plain text only: no markdown symbols (#, *, **, backticks) inside any field.
- Organise the content into clear sections with descriptive headings.`;

const renderPdf = (doc: DocumentContent): Promise<Buffer> =>
    new Promise((resolve, reject) => {
        const pdf = new PDFDocument({ size: "A4", margin: 56, info: { Title: doc.title } });
        const chunks: Buffer[] = [];
        pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
        pdf.on("end", () => resolve(Buffer.concat(chunks)));
        pdf.on("error", reject);

        pdf.font("Helvetica-Bold").fontSize(24).text(doc.title);
        if (doc.subtitle) pdf.moveDown(0.3).font("Helvetica").fontSize(13).fillColor("#555555").text(doc.subtitle);
        pdf.fillColor("#000000").moveDown(1.2);

        for (const section of doc.sections) {
            pdf.font("Helvetica-Bold").fontSize(15).text(section.heading).moveDown(0.4);
            pdf.font("Helvetica").fontSize(11);
            for (const p of section.paragraphs ?? []) pdf.text(p, { align: "justify", lineGap: 2 }).moveDown(0.6);
            if (section.bullets?.length) pdf.list(section.bullets, { bulletRadius: 2, lineGap: 2 }).moveDown(0.6);
            pdf.moveDown(0.6);
        }
        pdf.end();
    });

export const pdfAgent = async (state: typeof agentState.State, config?: RunnableConfig) => {
    const llm = getmodel("pdf").withStructuredOutput(documentSchema);
    // config carries the abort signal, so Stop cancels the LLM call
    const content = (await llm.invoke(
        [new SystemMessage(PDF_PROMPT), ...toMessages(state.history), new HumanMessage(state.prompt)],
        config
    )) as DocumentContent | null | undefined;
    // withStructuredOutput returns nothing (instead of throwing) when the model skips the tool call,
    // its JSON is cut off, or required fields are missing — fail with a clear message instead of a TypeError.
    if (!content?.title || !Array.isArray(content.sections)) {
        throw new Error("PDF model did not return a valid document (structured output failed)");
    }

    const buffer = await renderPdf(content);
    if (config?.signal?.aborted) throw new Error("Aborted"); // don't upload a file nobody will see

    const { file, url } = await publishGeneratedFile(state, buffer, {
        title: content.title,
        extension: "pdf",
        contentType: "application/pdf",
    });

    const outline = content.sections.map((s) => `- ${s.heading}`).join("\n");
    return {
        aiResponse: `Here's your PDF: **[${file.name}](${url})**\n\n**${content.title}**\n${outline}`,
        files: [file],
    };
};
