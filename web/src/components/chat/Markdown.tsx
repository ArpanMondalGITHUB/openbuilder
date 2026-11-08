import { useMemo, type ReactNode } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { SEGMENT_PLACEHOLDER_LANG } from "../../lib/artifacts"

// gfm: autolinks bare URLs (the "Sources:" list), tables, strikethrough
// breaks: a single newline stays a line break, so each source keeps its own line
const plugins = [remarkGfm, remarkBreaks]

type HastNode = { type: string; tagName?: string; value?: string; properties?: { className?: unknown }; children?: HastNode[] }

// index of a ```oa-segment placeholder block, or null for a normal code block
const placeholderIndex = (pre: HastNode | undefined): number | null => {
    const code = pre?.children?.find((c) => c.type === "element" && c.tagName === "code")
    const classes = code?.properties?.className
    if (!Array.isArray(classes) || !classes.includes(`language-${SEGMENT_PLACEHOLDER_LANG}`)) return null
    const index = Number(code?.children?.map((c) => c.value ?? "").join("").trim())
    return Number.isInteger(index) ? index : null
}

interface MarkdownProps {
    text: string
    // renders a placeholder block (artifact card / inline snippet) by segment index
    renderBlock?: (index: number) => ReactNode
}

// Raw HTML in the model's output is NOT rendered (react-markdown default), and
// unsafe link protocols like javascript: are stripped by its default urlTransform.
export default function Markdown({ text, renderBlock }: MarkdownProps) {
    const components = useMemo<Components>(
        () => ({
            a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                </a>
            ),
            pre: ({ node, children, ...props }) => {
                const index = renderBlock ? placeholderIndex(node as HastNode | undefined) : null
                if (index !== null) return <>{renderBlock!(index)}</>
                return <pre {...props}>{children}</pre>
            },
        }),
        [renderBlock]
    )

    return (
        <div className="chat-md">
            <ReactMarkdown remarkPlugins={plugins} components={components}>
                {text}
            </ReactMarkdown>
        </div>
    )
}
