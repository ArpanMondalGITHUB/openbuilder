import { useEffect, useMemo, useRef, useState } from "react"
import { LoaderCircle, Monitor, RotateCcw, Smartphone, TriangleAlert } from "lucide-react"
import type { Artifact } from "../../lib/artifacts"
import { buildPreviewDoc } from "../../lib/preview"

type Status = { kind: "loading" } | { kind: "ready" } | { kind: "error"; message: string }
type Viewport = "desktop" | "mobile"

// SECURITY: never add "allow-same-origin". Without it the frame has an opaque origin,
// so generated code can't read this app's cookies, localStorage (auth) or DOM.
const SANDBOX = "allow-scripts allow-forms allow-modals"

export default function PreviewFrame({ artifact }: { artifact: Artifact }) {
    const doc = useMemo(() => buildPreviewDoc(artifact), [artifact])
    const frameRef = useRef<HTMLIFrameElement>(null)
    const [run, setRun] = useState(0)
    const [status, setStatus] = useState<Status>({ kind: "loading" })
    const [viewport, setViewport] = useState<Viewport>("desktop")

    useEffect(() => {
        const onMessage = (e: MessageEvent) => {
            // only our own iframe, only our own messages
            if (e.source !== frameRef.current?.contentWindow || e.data?.source !== "oa-preview") return
            if (e.data.type === "ready") setStatus((s) => (s.kind === "error" ? s : { kind: "ready" }))
            else if (e.data.type === "error") setStatus({ kind: "error", message: e.data.message || "Unknown error" })
        }
        window.addEventListener("message", onMessage)
        return () => window.removeEventListener("message", onMessage)
    }, [])

    const reload = () => {
        setStatus({ kind: "loading" })
        setRun((r) => r + 1)
    }

    const toggleBtn = (active: boolean) =>
        `grid size-8 place-items-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-ring lg:size-7 ${
            active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
        }`

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* toolbar */}
            <div className="flex shrink-0 items-center gap-1 border-b border-white/10 px-4 py-1.5 text-xs">
                <span className="flex-1 text-muted-foreground" role="status">
                    {status.kind === "loading" ? "Building preview…" : status.kind === "error" ? "Preview failed" : "Live preview"}
                </span>
                <button type="button" onClick={() => setViewport("desktop")} aria-pressed={viewport === "desktop"} aria-label="Desktop width" title="Desktop" className={toggleBtn(viewport === "desktop")}>
                    <Monitor className="size-3.5" />
                </button>
                <button type="button" onClick={() => setViewport("mobile")} aria-pressed={viewport === "mobile"} aria-label="Mobile width" title="Mobile" className={toggleBtn(viewport === "mobile")}>
                    <Smartphone className="size-3.5" />
                </button>
                <button type="button" onClick={reload} aria-label="Reload preview" title="Reload" className={toggleBtn(false)}>
                    <RotateCcw className="size-3.5" />
                </button>
            </div>

            {/* stage */}
            <div className={`relative min-h-0 flex-1 overflow-auto pb-[env(safe-area-inset-bottom)] ${viewport === "mobile" ? "bg-background/60 p-4" : ""}`}>
                <iframe
                    key={run}
                    ref={frameRef}
                    title={`Preview of ${artifact.title}`}
                    sandbox={SANDBOX}
                    srcDoc={doc}
                    className={`block border-0 bg-white ${
                        viewport === "mobile" ? "mx-auto h-full min-h-160 w-97.5 max-w-full rounded-xl shadow-lg" : "size-full"
                    }`}
                />

                {status.kind === "loading" && (
                    <div className="pointer-events-none absolute inset-0 grid place-items-center bg-card/60">
                        <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
                    </div>
                )}

                {status.kind === "error" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/95 p-6 text-center">
                        <TriangleAlert className="size-6 text-destructive" aria-hidden="true" />
                        <p className="text-sm font-medium">This preview couldn't run</p>
                        <pre className="thin-scroll max-h-48 max-w-full overflow-auto rounded-lg bg-black/30 px-3 py-2 text-left font-mono text-xs whitespace-pre-wrap text-muted-foreground">
                            {status.message}
                        </pre>
                        <button
                            type="button"
                            onClick={reload}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-medium transition-colors hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-ring"
                        >
                            <RotateCcw className="size-3.5" /> Reload
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
