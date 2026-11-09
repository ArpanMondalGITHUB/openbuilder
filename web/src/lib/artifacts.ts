// Turns an assistant reply (markdown) into text segments plus one artifact
// holding every code file in that reply. The coding agent writes the file path
// after the language tag:  ```tsx src/components/Card.tsx
// Images, PDFs and decks the agents upload to S3 become "asset" segments.

import { extractGeneratedFiles, type GeneratedFile } from "./generatedFiles"

export interface ArtifactFile {
    path: string
    language: string
    code: string
}

export interface Artifact {
    id: string // the assistant message id
    title: string
    files: ArtifactFile[]
}

export type Segment =
    | { type: "text"; text: string }
    | { type: "code"; language: string; code: string } // short snippet, kept inline
    | { type: "file"; index: number } // points into artifact.files
    | { type: "asset"; file: GeneratedFile } // generated image / pdf / pptx

export interface ParsedMessage {
    segments: Segment[]
    artifact: Artifact | null
    // The whole reply as ONE markdown document, every code/file segment replaced
    // by a ```oa-segment placeholder whose body is the segment index. Rendering it
    // in a single pass keeps lists continuous across code blocks.
    markdown: string
}

export const SEGMENT_PLACEHOLDER_LANG = "oa-segment"

const FENCE = /```([^\n`]*)\n([\s\S]*?)```/g
// blocks shorter than this without a path stay inline (e.g. `npm i zod`)
const MIN_FILE_LINES = 4

const EXT_BY_LANG: Record<string, string> = {
    typescript: "ts", ts: "ts", tsx: "tsx", javascript: "js", js: "js", jsx: "jsx",
    html: "html", css: "css", scss: "scss", json: "json", python: "py", py: "py",
    bash: "sh", sh: "sh", shell: "sh", sql: "sql", go: "go", rust: "rs", java: "java",
    yaml: "yml", yml: "yml", markdown: "md", md: "md", dockerfile: "Dockerfile",
}

const LANG_BY_EXT: Record<string, string> = Object.fromEntries(
    Object.entries(EXT_BY_LANG).map(([lang, ext]) => [ext.toLowerCase(), lang])
)

const looksLikePath = (s: string) => /^[\w@.\-/]+\.\w+$/.test(s) || /^[\w@.-]+\/[\w@.\-/]+$/.test(s)

// "tsx src/App.tsx" | "tsx title=\"src/App.tsx\"" | "src/App.tsx" | "tsx"
const parseInfo = (info: string) => {
    const named = info.match(/\b(?:title|file|filename|path)=["']?([^"'\s]+)/)?.[1]
    const tokens = info.trim().split(/\s+/).filter(Boolean)
    let language = tokens[0] && !looksLikePath(tokens[0]) && !tokens[0].includes("=") ? tokens[0] : ""
    const path = named ?? tokens.find((t) => looksLikePath(t) && t !== language)
    if (!language && path) language = LANG_BY_EXT[path.split(".").pop()!.toLowerCase()] ?? ""
    return { language: language.toLowerCase(), path }
}

// a first line like `// src/App.tsx` or `<!-- index.html -->`
const PATH_COMMENT = /^\s*(?:\/\/|#|<!--|\/\*)\s*([\w@.\-/]+\.\w+)\s*(?:-->|\*\/)?\s*$/

// a text line right before the block like `**src/App.tsx**` or `` `src/App.tsx`: ``
const PATH_HEADING = /(?:^|\n)[ \t]*(?:#+\s*)?(?:\*\*|`)?([\w@.\-/]+\.\w+)(?:\*\*|`)?:?[ \t]*$/

export function parseMessage(messageId: string, content: string): ParsedMessage {
    const segments: Segment[] = []
    const files: ArtifactFile[] = []
    let markdown = ""
    let last = 0
    const fence = "```"

    // agent files in plain text (never inside a code block) become their own segments
    const withAssets = (text: string) =>
        extractGeneratedFiles(text, (file) => {
            segments.push({ type: "asset", file })
            return `${fence}${SEGMENT_PLACEHOLDER_LANG}\n${segments.length - 1}\n${fence}`
        })

    for (const m of content.matchAll(FENCE)) {
        const rawBefore = content.slice(last, m.index)
        let before = rawBefore
        // a fence nested in a list item is indented; the placeholder keeps that
        // indent (so the list continues) and the code loses it
        const indent = rawBefore.match(/(?:^|\n)([ \t]*)$/)?.[1] ?? ""
        const info = parseInfo(m[1])
        const language = info.language
        let path = info.path
        // also drops the indent an indented closing fence leaves on the last line
        let code = m[2].replace(/\n[ \t]*$/, "")
        if (indent) {
            code = code
                .split("\n")
                .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line.trimStart()))
                .join("\n")
        }
        let headingRemoved = false

        if (!path) {
            const firstLine = code.split("\n", 1)[0]
            const fromComment = firstLine.match(PATH_COMMENT)?.[1]
            if (fromComment) {
                path = fromComment
                code = code.slice(firstLine.length + 1)
            }
        }
        if (!path) {
            before = before.trimEnd()
            const heading = before.match(PATH_HEADING)
            if (heading) {
                path = heading[1]
                before = before.slice(0, heading.index)
                headingRemoved = true
            }
        }

        if (before.trim()) segments.push({ type: "text", text: before.trim() })

        if (path || code.split("\n").length >= MIN_FILE_LINES) {
            const ext = EXT_BY_LANG[language] ?? "txt"
            const name = path ?? `snippet-${files.length + 1}.${ext}`
            files.push({ path: name, language: language || LANG_BY_EXT[ext] || "text", code })
            segments.push({ type: "file", index: files.length - 1 })
        } else {
            segments.push({ type: "code", language, code })
        }
        const placeholder = `${fence}${SEGMENT_PLACEHOLDER_LANG}\n${indent}${segments.length - 1}\n${indent}${fence}`
        // the path heading became the file name, so it is dropped from the text
        markdown += (headingRemoved ? `${before}\n\n${indent}` : rawBefore) + placeholder
        last = m.index! + m[0].length
    }

    const rest = content.slice(last).trim()
    if (rest) segments.push({ type: "text", text: rest })
    markdown += withAssets(content.slice(last))

    const artifact =
        files.length > 0
            ? {
                  id: messageId,
                  // "ProfileCard.tsx" or "ProfileCard.tsx +2"
                  title: `${files[0].path.split("/").pop()!}${files.length > 1 ? ` +${files.length - 1}` : ""}`,
                  files,
              }
            : null

    return { segments, artifact, markdown }
}

export const artifactOf = (m: { id: string; content: string }) => parseMessage(m.id, m.content).artifact
