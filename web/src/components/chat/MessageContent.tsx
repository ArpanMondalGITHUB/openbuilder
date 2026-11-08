import { ChevronRight, FileCode2 } from "lucide-react"
import type { ParsedMessage } from "../../lib/artifacts"
import Markdown from "./Markdown"

interface MessageContentProps {
    parsed: ParsedMessage
    isOpen: boolean
    onOpenFile: (path: string) => void
}

// Text stays in the chat; code files collapse into one card that opens the side panel.
export default function MessageContent({ parsed, isOpen, onOpenFile }: MessageContentProps) {
    const { segments, artifact } = parsed
    const firstFile = segments.findIndex((s) => s.type === "file")

    return (
        <div className="min-w-0 flex-1 space-y-3 leading-relaxed text-foreground">
            {segments.map((s, i) => {
                if (s.type === "text") return <Markdown key={i} text={s.text} />
                if (s.type === "code") {
                    return (
                        <pre key={i} className="overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-[13px]">
                            <code>{s.code}</code>
                        </pre>
                    )
                }
                // every file shares one card, placed where the first file appeared
                if (i !== firstFile || !artifact) return null
                return (
                    <div
                        key={i}
                        className={`overflow-hidden rounded-xl border bg-card transition-colors ${isOpen ? "border-ring/70" : "border-border"}`}
                    >
                        <button
                            type="button"
                            onClick={() => onOpenFile(artifact.files[0].path)}
                            className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50"
                        >
                            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
                                <FileCode2 className="size-5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{artifact.title}</span>
                                <span className="text-xs text-muted-foreground">
                                    {isOpen ? "Open in panel" : "Click to open code"}
                                </span>
                            </span>
                            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                        </button>
                        {artifact.files.length > 1 && (
                            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
                                {artifact.files.map((f) => (
                                    <button
                                        key={f.path}
                                        type="button"
                                        onClick={() => onOpenFile(f.path)}
                                        className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                                    >
                                        {f.path}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
