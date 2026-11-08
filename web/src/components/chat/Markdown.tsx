import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"

// Raw HTML in the model's output is NOT rendered (react-markdown default), and
// unsafe link protocols like javascript: are stripped by its default urlTransform.
const components: Components = {
    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    ),
}

// gfm: autolinks bare URLs (the "Sources:" list), tables, strikethrough
// breaks: a single newline stays a line break, so each source keeps its own line
const plugins = [remarkGfm, remarkBreaks]

export default function Markdown({ text }: { text: string }) {
    return (
        <div className="chat-md">
            <ReactMarkdown remarkPlugins={plugins} components={components}>
                {text}
            </ReactMarkdown>
        </div>
    )
}
