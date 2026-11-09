import { useState } from "react"
import { Dialog } from "radix-ui"
import { Download, ExternalLink, ImageOff, Loader2, Maximize2, RotateCcw, X } from "lucide-react"
import type { GeneratedFile } from "../../lib/generatedFiles"
import { downloadFile, openInNewTab, useDisplayUrl } from "../../hooks/useGeneratedFile"

// An image from the image agent: a framed card with a loading shimmer, hover
// actions, and a full-screen viewer on click.
export default function GeneratedImage({ file }: { file: GeneratedFile }) {
    const { url, error, retry, reload } = useDisplayUrl(file)
    const [loaded, setLoaded] = useState(false)
    const [viewerOpen, setViewerOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const label = file.alt || "Generated image"

    const download = async () => {
        setBusy(true)
        try {
            await downloadFile(file)
        } catch {
            /* link couldn't be signed — the button just stops spinning */
        } finally {
            setBusy(false)
        }
    }

    const actionBtn =
        "grid size-9 place-items-center rounded-lg bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-ring"

    if (error) {
        return (
            <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
                <ImageOff className="size-6" aria-hidden="true" />
                <p>This image couldn't be loaded.</p>
                <button
                    type="button"
                    onClick={reload}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-foreground hover:bg-muted"
                >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    Try again
                </button>
            </div>
        )
    }

    return (
        <figure className="group relative w-fit max-w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[0_16px_40px_-24px_rgb(0_0_0/0.8)]">
            {/* placeholder keeps a square-ish box while the image loads, so the chat doesn't jump */}
            {!loaded && (
                <div
                    className="grid aspect-square w-[min(28rem,80vw)] place-items-center bg-[linear-gradient(110deg,var(--muted)_30%,oklch(1_0_0/0.06)_50%,var(--muted)_70%)] bg-[length:200%_100%] motion-safe:animate-[shimmer_1.6s_linear_infinite]"
                    role="status"
                    aria-label="Loading image"
                >
                    <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
                </div>
            )}
            {url && (
                <button
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    className={`block cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${loaded ? "" : "absolute inset-0 opacity-0"}`}
                    aria-label={`View image: ${label}`}
                >
                    <img
                        src={url}
                        alt={label}
                        onLoad={() => setLoaded(true)}
                        onError={() => {
                            setLoaded(false)
                            retry()
                        }}
                        className="block max-h-[28rem] w-auto max-w-full object-contain animate-in fade-in-0 duration-300"
                    />
                </button>
            )}

            {loaded && (
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100">
                    <button type="button" onClick={() => setViewerOpen(true)} className={actionBtn} aria-label="View full size" title="View full size">
                        <Maximize2 className="size-4" />
                    </button>
                    <button type="button" onClick={download} className={actionBtn} aria-label="Download image" title="Download" disabled={busy}>
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    </button>
                </div>
            )}

            {url && (
                <ImageViewer
                    open={viewerOpen}
                    onOpenChange={setViewerOpen}
                    url={url}
                    label={label}
                    onDownload={download}
                    onOpenTab={() => void openInNewTab(file).catch(() => {})}
                    busy={busy}
                />
            )}
        </figure>
    )
}

interface ImageViewerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    url: string
    label: string
    onDownload: () => void
    onOpenTab: () => void
    busy: boolean
}

function ImageViewer({ open, onOpenChange, url, label, onDownload, onOpenTab, busy }: ImageViewerProps) {
    const btn =
        "grid size-10 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                {/* the portal sits outside the app's .dark wrapper, so it brings its own */}
                <Dialog.Overlay className="dark fixed inset-0 z-50 bg-black/85 backdrop-blur-sm animate-in fade-in-0 duration-200" />
                <Dialog.Content
                    aria-describedby={undefined}
                    className="dark fixed inset-0 z-50 flex flex-col text-foreground outline-none animate-in fade-in-0 zoom-in-95 duration-200"
                    onClick={(e) => {
                        // clicking the backdrop around the image closes it
                        if (e.target === e.currentTarget) onOpenChange(false)
                    }}
                >
                    <header className="flex shrink-0 items-center gap-2 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                        <Dialog.Title className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">{label}</Dialog.Title>
                        <button type="button" onClick={onOpenTab} className={btn} aria-label="Open in new tab" title="Open in new tab">
                            <ExternalLink className="size-4" />
                        </button>
                        <button type="button" onClick={onDownload} className={btn} aria-label="Download image" title="Download" disabled={busy}>
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                        </button>
                        <Dialog.Close className={btn} aria-label="Close" title="Close">
                            <X className="size-5" />
                        </Dialog.Close>
                    </header>
                    <div
                        className="flex min-h-0 flex-1 items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
                        onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
                    >
                        <img src={url} alt={label} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
