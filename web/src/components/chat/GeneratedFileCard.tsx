import { useState } from "react"
import { AlertCircle, Download, ExternalLink, FileText, Loader2, Presentation, File } from "lucide-react"
import { KIND_LABEL, type GeneratedFile } from "../../lib/generatedFiles"
import { downloadFile, openInNewTab } from "../../hooks/useGeneratedFile"

// Per type: icon, and a tint for the tile + extension badge so a PDF and a deck
// are told apart at a glance.
const STYLE = {
    pdf: { Icon: FileText, tile: "bg-red-400/12 text-red-300 ring-red-400/25", badge: "bg-red-400/15 text-red-200" },
    pptx: { Icon: Presentation, tile: "bg-orange-400/12 text-orange-300 ring-orange-400/25", badge: "bg-orange-400/15 text-orange-200" },
    file: { Icon: File, tile: "bg-primary/12 text-primary ring-primary/25", badge: "bg-primary/15 text-primary" },
    image: { Icon: File, tile: "bg-primary/12 text-primary ring-primary/25", badge: "bg-primary/15 text-primary" },
} as const

type Action = "open" | "download"

// A document from the pdf / ppt agent: name, type, and Open / Download.
// Links are signed on click, so a card from last month still works.
export default function GeneratedFileCard({ file }: { file: GeneratedFile }) {
    const [busy, setBusy] = useState<Action | null>(null)
    const [failed, setFailed] = useState(false)
    const { Icon, tile, badge } = STYLE[file.kind]
    // browsers can show PDFs; a .pptx can only be downloaded
    const canOpen = file.kind === "pdf"

    const run = async (action: Action) => {
        setBusy(action)
        setFailed(false)
        try {
            await (action === "open" ? openInNewTab(file) : downloadFile(file))
        } catch {
            setFailed(true)
        } finally {
            setBusy(null)
        }
    }

    const btn =
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"

    return (
        <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-white/20">
            <div className="flex items-center gap-3 p-3">
                <span className={`relative grid size-11 shrink-0 place-items-center rounded-lg ring-1 ${tile}`}>
                    <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground" title={file.name}>
                        {file.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={`rounded px-1.5 py-px font-mono text-[10px] font-semibold uppercase ${badge}`}>{file.ext}</span>
                        {KIND_LABEL[file.kind]}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border bg-background/30 px-3 py-2">
                {failed ? (
                    <span role="alert" className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-destructive">
                        <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">Couldn't get the file. Try again.</span>
                    </span>
                ) : (
                    <span className="flex-1" />
                )}
                {canOpen && (
                    <button
                        type="button"
                        onClick={() => void run("open")}
                        disabled={busy !== null}
                        className={`${btn} text-foreground hover:bg-white/8`}
                        aria-label={`Open ${file.name} in a new tab`}
                    >
                        {busy === "open" ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />}
                        Open
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => void run("download")}
                    disabled={busy !== null}
                    className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90`}
                    aria-label={`Download ${file.name}`}
                >
                    {busy === "download" ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                    Download
                </button>
            </div>
        </div>
    )
}
