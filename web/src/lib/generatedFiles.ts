// Files the image / pdf / ppt agents upload to S3. The agent writes them into the
// reply as markdown with a presigned link:
//   image:     ![prompt](https://<bucket>.s3...amazonaws.com/<userId>/<convId>/<uuid>.png?X-Amz-...)
//   pdf / ppt: **[Q3-Report.pdf](https://...)**
// The link expires (7 days max), so the key is kept to ask for a fresh one.

export type GeneratedFileKind = "image" | "pdf" | "pptx" | "file"

export interface GeneratedFile {
    key: string // <userId>/<conversationId>/<uuid>.<ext>, as built by the agent's storage service
    url: string // the presigned link as written in the reply
    name: string // file name to show / save as
    ext: string
    kind: GeneratedFileKind
    alt: string // image description (the prompt), "" for documents
    expiresAt: number | null // ms epoch, null if the link carries no expiry
}

// the agent builds keys this way, so anything else isn't one of its files
const KEY_PATTERN = /([^/]+\/[^/]+\/[0-9a-f-]{36}\.(\w+))$/i

const KIND_BY_EXT: Record<string, GeneratedFileKind> = {
    png: "image", jpg: "image", jpeg: "image", webp: "image", gif: "image",
    pdf: "pdf",
    pptx: "pptx", ppt: "pptx",
}

// X-Amz-Date=20261109T101500Z + X-Amz-Expires=604800
const expiryOf = (params: URLSearchParams): number | null => {
    const date = params.get("X-Amz-Date")?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
    const seconds = Number(params.get("X-Amz-Expires"))
    if (!date || !Number.isFinite(seconds)) return null
    const [, y, mo, d, h, mi, s] = date.map(Number)
    return Date.UTC(y, mo - 1, d, h, mi, s) + seconds * 1000
}

const slug = (text: string) =>
    text.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "image"

export function parseGeneratedFile(href: string, label = "", isImage = false): GeneratedFile | null {
    let u: URL
    try {
        u = new URL(href)
    } catch {
        return null
    }
    if (u.protocol !== "https:" || !u.searchParams.has("X-Amz-Signature")) return null
    const match = decodeURIComponent(u.pathname).match(KEY_PATTERN)
    if (!match) return null

    const key = match[1]
    const ext = match[2].toLowerCase()
    const kind = KIND_BY_EXT[ext] ?? "file"
    const text = label.trim()
    const name = isImage || kind === "image" ? `${slug(text)}.${ext}` : text.includes(".") ? text : `${slug(text) || "file"}.${ext}`

    return { key, url: href, name, ext, kind, alt: isImage ? text : "", expiresAt: expiryOf(u.searchParams) }
}

// A link counts as expired a minute early so it doesn't die between render and click.
export const isExpired = (file: GeneratedFile, now = Date.now()) =>
    file.expiresAt !== null && file.expiresAt - 60_000 <= now

export const KIND_LABEL: Record<GeneratedFileKind, string> = {
    image: "Image",
    pdf: "PDF document",
    pptx: "PowerPoint presentation",
    file: "File",
}

// `**[name](url)**` or `![alt](url)` written by an agent; the bold is optional
const ASSET_LINK = /(\*\*|__)?(!?)\[([^\]\n]*)\]\((https:\/\/[^)\s]+)\)\1?/g

// Finds agent files in a chunk of markdown (outside code fences) and swaps each
// for a placeholder via `toPlaceholder`, so it renders as a block card instead of
// an inline link. Anything that isn't an agent file is left as it was.
export function extractGeneratedFiles(
    text: string,
    toPlaceholder: (file: GeneratedFile) => string
): string {
    return text.replace(ASSET_LINK, (whole, _bold, bang: string, label: string, href: string) => {
        const file = parseGeneratedFile(href, label, bang === "!")
        return file ? `\n\n${toPlaceholder(file)}\n\n` : whole
    })
}
