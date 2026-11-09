import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react"
import { Dialog } from "radix-ui"
import { Highlight, Prism, type PrismTheme } from "prism-react-renderer"
import { Check, ChevronRight, Copy, Download, FileCode2, WrapText, X } from "lucide-react"
import type { Artifact } from "../../lib/artifacts"

// Must match the `lg:` classes below: from lg up the panel is a resizable side card,
// under it a full-screen modal.
const LG_QUERY = "(min-width: 64rem)"
const subscribeLg = (onChange: () => void) => {
    const mql = window.matchMedia(LG_QUERY)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
}
const useIsLg = () => useSyncExternalStore(subscribeLg, () => window.matchMedia(LG_QUERY).matches)

const WIDTH_KEY = "artifactPanelWidth"
const MIN_PANEL = 360 // px
const MIN_CHAT = 380 // px the chat column keeps while resizing

const readWidth = () => {
    try {
        const n = Number(localStorage.getItem(WIDTH_KEY))
        return Number.isFinite(n) && n > 0 ? n : null
    } catch {
        return null
    }
}

// Sage-tinted dark theme so the code matches the app instead of a stock editor theme
const theme: PrismTheme = {
    plain: { color: "oklch(0.93 0.01 110)", backgroundColor: "transparent" },
    styles: [
        { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "oklch(0.62 0.03 140)", fontStyle: "italic" } },
        { types: ["punctuation"], style: { color: "oklch(0.72 0.02 140)" } },
        { types: ["keyword", "operator", "important", "atrule"], style: { color: "oklch(0.79 0.11 305)" } },
        { types: ["string", "char", "attr-value", "regex", "inserted"], style: { color: "oklch(0.85 0.13 128)" } },
        { types: ["function", "selector"], style: { color: "oklch(0.83 0.09 235)" } },
        { types: ["number", "boolean", "constant", "symbol"], style: { color: "oklch(0.82 0.12 65)" } },
        { types: ["tag", "deleted"], style: { color: "oklch(0.77 0.12 25)" } },
        { types: ["attr-name", "property"], style: { color: "oklch(0.86 0.1 95)" } },
        { types: ["class-name", "maybe-class-name", "builtin"], style: { color: "oklch(0.86 0.09 185)" } },
    ],
}

const LANG_ALIAS: Record<string, string> = { html: "markup", xml: "markup", svg: "markup", sh: "plain", bash: "plain", shell: "plain" }
const prismLang = (lang: string) => {
    const l = LANG_ALIAS[lang] ?? lang
    return Prism.languages[l] ? l : "plain"
}

const splitPath = (path: string) => {
    const i = path.lastIndexOf("/")
    return i === -1 ? { dir: "", name: path } : { dir: path.slice(0, i + 1), name: path.slice(i + 1) }
}

interface ArtifactPanelProps {
    artifact: Artifact
    activePath: string
    onSelectFile: (path: string) => void
    onClose: () => void
}

export default function ArtifactPanel({ artifact, activePath, onSelectFile, onClose }: ArtifactPanelProps) {
    const isLg = useIsLg()
    const [copied, setCopied] = useState(false)
    // wrap by default on small screens, where horizontal scrolling is painful
    const [wrap, setWrap] = useState(() => !window.matchMedia(LG_QUERY).matches)
    const [width, setWidth] = useState<number | null>(readWidth)
    const [opener] = useState(() => document.activeElement as HTMLElement | null)
    const panelRef = useRef<HTMLElement>(null)
    const codeRef = useRef<HTMLDivElement>(null)
    const activeTabRef = useRef<HTMLButtonElement>(null)

    const file = artifact.files.find((f) => f.path === activePath) ?? artifact.files[0]
    const { name } = splitPath(file.path)
    const crumbs = file.path.split("/")
    const lineCount = file.code.split("\n").length
    const multi = artifact.files.length > 1

    // new file: start at the top-left and keep its tab in view
    useEffect(() => {
        codeRef.current?.scrollTo({ top: 0, left: 0 })
        activeTabRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" })
    }, [file.path])

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
        a.download = name
        a.click()
        URL.revokeObjectURL(url)
    }

    // ---- resize (lg+) ----
    const clampWidth = useCallback((px: number) => {
        const row = panelRef.current?.parentElement?.getBoundingClientRect().width ?? window.innerWidth
        return Math.round(Math.min(Math.max(px, MIN_PANEL), Math.max(MIN_PANEL, row - MIN_CHAT)))
    }, [])

    const saveWidth = (px: number) => {
        try {
            localStorage.setItem(WIDTH_KEY, String(px))
        } catch {
            /* storage blocked — width just won't persist */
        }
    }

    const startResize = (e: PointerEvent<HTMLDivElement>) => {
        e.preventDefault()
        const handle = e.currentTarget
        handle.setPointerCapture(e.pointerId)
        const right = panelRef.current!.getBoundingClientRect().right
        let latest = width ?? panelRef.current!.getBoundingClientRect().width
        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"

        const move = (ev: globalThis.PointerEvent) => {
            latest = clampWidth(right - ev.clientX)
            setWidth(latest)
        }
        const end = () => {
            handle.removeEventListener("pointermove", move)
            handle.removeEventListener("pointerup", end)
            handle.removeEventListener("pointercancel", end)
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
            saveWidth(latest)
        }
        handle.addEventListener("pointermove", move)
        handle.addEventListener("pointerup", end)
        handle.addEventListener("pointercancel", end)
    }

    const resizeByKey = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
        e.preventDefault()
        const current = width ?? panelRef.current!.getBoundingClientRect().width
        const next = clampWidth(current + (e.key === "ArrowLeft" ? 32 : -32))
        setWidth(next)
        saveWidth(next)
    }

    const iconBtn =
        "grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring lg:size-8"

    return (
        // Below lg: modal (Radix traps focus, hides and disables the chat behind it, Esc closes).
        // From lg: non-modal side card: no focus move, chat stays usable, Esc is left to the chat's Stop shortcut.
        <Dialog.Root open modal={!isLg} onOpenChange={(next) => !next && onClose()}>
            <Dialog.Content
                asChild
                aria-describedby={undefined}
                onOpenAutoFocus={(e) => {
                    e.preventDefault()
                    // modal: focus the panel itself (inside the trap) rather than ringing the first button
                    if (!isLg) panelRef.current?.focus()
                }}
                onCloseAutoFocus={(e) => {
                    // Radix only restores focus to a Dialog.Trigger, and there isn't one here
                    e.preventDefault()
                    if (!isLg && opener?.isConnected) opener.focus()
                }}
                onInteractOutside={(e) => {
                    if (isLg) e.preventDefault()
                }}
                onEscapeKeyDown={(e) => {
                    if (isLg) e.preventDefault()
                }}
            >
                <aside
                    ref={panelRef}
                    tabIndex={-1}
                    // CSS min/max keep a saved width valid when the window shrinks
                    style={isLg && width ? { width } : undefined}
                    className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-card outline-none text-card-foreground animate-in fade-in-0 duration-200 max-lg:slide-in-from-bottom-4 lg:relative lg:inset-auto lg:z-auto lg:my-2 lg:mr-2 lg:w-1/2 lg:max-w-[calc(100%-24rem)] lg:min-w-[22.5rem] lg:shrink-0 lg:rounded-2xl lg:border lg:border-white/10 lg:shadow-[0_24px_60px_-24px_rgb(0_0_0/0.7)] lg:slide-in-from-right-6"
                >
                    {/* drag handle on the left edge (desktop) */}
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize code panel"
                        aria-valuemin={MIN_PANEL}
                        aria-valuenow={width ?? undefined}
                        tabIndex={0}
                        onPointerDown={startResize}
                        onKeyDown={resizeByKey}
                        onDoubleClick={() => {
                            setWidth(null)
                            try {
                                localStorage.removeItem(WIDTH_KEY)
                            } catch {
                                /* ignore */
                            }
                        }}
                        title="Drag to resize · double-click to reset"
                        className="group absolute inset-y-0 left-0 z-20 hidden w-3 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center focus-visible:outline-none lg:flex"
                    >
                        <span className="h-10 w-1 rounded-full bg-white/15 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:bg-ring group-focus-visible:opacity-100 group-active:bg-ring group-active:opacity-100" />
                    </div>

                    {/* header */}
                    <header className="flex shrink-0 items-center gap-3 border-b border-white/10 py-2.5 pr-2 pl-4 pt-[max(0.625rem,env(safe-area-inset-top))]">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                            <FileCode2 className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <Dialog.Title asChild>
                                <h2 className="truncate text-sm font-semibold tracking-normal">{artifact.title}</h2>
                            </Dialog.Title>
                            <p className="text-xs text-muted-foreground">
                                {artifact.files.length} {artifact.files.length === 1 ? "file" : "files"} · Code
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={copy}
                            aria-label={copied ? "Copied" : "Copy file"}
                            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-medium text-foreground transition-colors hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-ring lg:h-8"
                        >
                            {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
                            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                        </button>
                        <button type="button" onClick={download} className={iconBtn} aria-label="Download file" title="Download">
                            <Download className="size-4" />
                        </button>
                        <button type="button" onClick={onClose} className={iconBtn} aria-label="Close code panel" title="Close">
                            <X className="size-4.5" />
                        </button>
                    </header>

                    {/* file tabs */}
                    {multi && (
                        <div
                            role="tablist"
                            aria-label="Files"
                            className="thin-scroll flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 bg-background/40 px-2 pt-2"
                        >
                            {artifact.files.map((f) => {
                                const active = f.path === file.path
                                return (
                                    <button
                                        key={f.path}
                                        ref={active ? activeTabRef : undefined}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        title={f.path}
                                        onClick={() => onSelectFile(f.path)}
                                        className={`relative flex h-10 max-w-[14rem] shrink-0 items-center gap-2 rounded-t-lg px-3 font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring lg:h-9 ${
                                            active
                                                ? "bg-card text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                                                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                        }`}
                                    >
                                        <FileCode2 className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
                                        <span className="truncate">{splitPath(f.path).name}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* path bar */}
                    <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-1.5 text-xs">
                        <nav aria-label="File path" className="flex min-w-0 flex-1 items-center gap-1 font-mono text-muted-foreground">
                            {crumbs.map((part, i) => (
                                <span key={i} className={`flex min-w-0 items-center gap-1 ${i === crumbs.length - 1 ? "text-foreground" : "hidden sm:flex"}`}>
                                    {i > 0 && <ChevronRight className="size-3 shrink-0 opacity-50" aria-hidden="true" />}
                                    <span className="truncate">{part}</span>
                                </span>
                            ))}
                        </nav>
                        <span className="hidden shrink-0 rounded-md bg-white/6 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground uppercase sm:inline">
                            {file.language || "text"}
                        </span>
                        <span className="shrink-0 text-muted-foreground tabular-nums">{lineCount} lines</span>
                        <button
                            type="button"
                            onClick={() => setWrap((w) => !w)}
                            aria-pressed={wrap}
                            aria-label="Wrap long lines"
                            title="Wrap long lines"
                            className={`grid size-8 shrink-0 place-items-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-ring lg:size-7 ${
                                wrap ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
                            }`}
                        >
                            <WrapText className="size-3.5" />
                        </button>
                    </div>

                    {/* code */}
                    <div ref={codeRef} className="thin-scroll min-h-0 flex-1 overflow-auto pb-[env(safe-area-inset-bottom)]">
                        <Highlight theme={theme} code={file.code} language={prismLang(file.language)}>
                            {({ tokens, getLineProps, getTokenProps }) => (
                                <pre
                                    className={`py-3 font-mono text-[13px] leading-6 ${wrap ? "min-w-0" : "min-w-max"}`}
                                    aria-label={`Contents of ${file.path}`}
                                >
                                    {tokens.map((line, i) => {
                                        const { className, ...lineProps } = getLineProps({ line })
                                        return (
                                            <div key={i} {...lineProps} className={`${className} flex hover:bg-white/[0.03]`}>
                                                <span
                                                    aria-hidden="true"
                                                    className="sticky left-0 w-12 shrink-0 bg-card pr-4 text-right text-muted-foreground/40 tabular-nums select-none"
                                                >
                                                    {i + 1}
                                                </span>
                                                <span
                                                    className={`pr-6 ${wrap ? "min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]" : "whitespace-pre"}`}
                                                >
                                                    {line.map((token, key) => (
                                                        <span key={key} {...getTokenProps({ token })} />
                                                    ))}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </pre>
                            )}
                        </Highlight>
                    </div>
                </aside>
            </Dialog.Content>
        </Dialog.Root>
    )
}
