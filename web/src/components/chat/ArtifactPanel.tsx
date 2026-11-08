import { useState } from "react"
import { Check, Copy, Download, FileCode2, X } from "lucide-react"
import type { Artifact } from "../../lib/artifacts"

interface ArtifactPanelProps {
    artifact: Artifact
    activePath: string
    onSelectFile: (path: string) => void
    onClose: () => void
}

const splitPath = (path: string) => {
    const i = path.lastIndexOf("/")
    return i === -1 ? { dir: "", name: path } : { dir: path.slice(0, i + 1), name: path.slice(i + 1) }
}

export default function ArtifactPanel({ artifact, activePath, onSelectFile, onClose }: ArtifactPanelProps) {
    const [copied, setCopied] = useState(false)
    const file = artifact.files.find((f) => f.path === activePath) ?? artifact.files[0]
    const lines = file.code.split("\n")
    const multi = artifact.files.length > 1

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(file.code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            /* clipboard blocked — nothing to do */
        }
    }

    const download = () => {
        const url = URL.createObjectURL(new Blob([file.code], { type: "text/plain;charset=utf-8" }))
        const a = document.createElement("a")
        a.href = url
        a.download = splitPath(file.path).name
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        // full screen on small screens, right-hand column from lg up
        <aside
            aria-label="Code artifact"
            className="fixed inset-0 z-50 flex flex-col bg-background lg:static lg:z-auto lg:w-[52%] lg:shrink-0 lg:border-l lg:border-border"
        >
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
                <FileCode2 className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-medium">{artifact.title}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{file.path}</p>
                </div>
                <button type="button" onClick={copy} className="icon-btn" aria-label="Copy file" title="Copy">
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </button>
                <button type="button" onClick={download} className="icon-btn" aria-label="Download file" title="Download">
                    <Download className="size-4" />
                </button>
                <button type="button" onClick={onClose} className="icon-btn" aria-label="Close artifact" title="Close">
                    <X className="size-4" />
                </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                {multi && (
                    <nav
                        aria-label="Files"
                        className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 md:w-56 md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-r md:border-b-0"
                    >
                        <p className="hidden px-2 pb-1 text-xs font-medium text-muted-foreground md:block">Files</p>
                        {artifact.files.map((f) => {
                            const { dir, name } = splitPath(f.path)
                            const active = f.path === file.path
                            return (
                                <button
                                    key={f.path}
                                    type="button"
                                    onClick={() => onSelectFile(f.path)}
                                    aria-current={active ? "true" : undefined}
                                    title={f.path}
                                    className={`shrink-0 rounded-md px-2 py-1.5 text-left font-mono text-xs transition-colors md:w-full ${
                                        active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                    }`}
                                >
                                    <span className="block truncate">
                                        <span className="opacity-60">{dir}</span>
                                        {name}
                                    </span>
                                </button>
                            )
                        })}
                    </nav>
                )}

                <div className="flex min-h-0 min-w-0 flex-1 overflow-auto font-mono text-[13px] leading-6">
                    <div
                        aria-hidden="true"
                        className="sticky left-0 shrink-0 bg-background py-3 pr-3 pl-4 text-right text-muted-foreground/50 select-none"
                    >
                        {lines.map((_, i) => (
                            <div key={i}>{i + 1}</div>
                        ))}
                    </div>
                    <pre className="flex-1 py-3 pr-6">
                        <code>{file.code}</code>
                    </pre>
                </div>
            </div>
        </aside>
    )
}
