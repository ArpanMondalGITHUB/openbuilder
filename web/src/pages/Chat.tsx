import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import axios from "axios"
import { AlertCircle, Loader2, RotateCcw, Sparkles } from "lucide-react"
import chatApi, { type Message } from "../api/chat.api"
import Composer from "../components/home/Composer"
import ArtifactPanel from "../components/chat/ArtifactPanel"
import MessageContent from "../components/chat/MessageContent"
import { artifactOf, parseMessage, type ParsedMessage } from "../lib/artifacts"

const POLL_EVERY_MS = 2000
const POLL_FOR_MS = 3 * 60_000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const replyFor = (list: Message[], requestId: string) =>
    list.find((m) => m.role === "assistant" && m.request_id === requestId)

type RouteState = { firstMessage?: string; requestId?: string } | null

// Keyed by conversation id so switching chats starts with fresh state.
export function ChatRoute() {
    const { conversationId = "" } = useParams()
    return <Chat key={conversationId} conversationId={conversationId} />
}

function Chat({ conversationId }: { conversationId: string }) {
    const location = useLocation()
    const navigate = useNavigate()

    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    // requestId of the turn we're waiting on an answer for
    const [waiting, setWaiting] = useState<string | null>(null)
    const [failed, setFailed] = useState<{ requestId: string; content: string } | null>(null)
    // which reply's files are in the side panel, and which file is shown
    const [open, setOpen] = useState<{ messageId: string; path: string } | null>(null)
    // bumping key remounts the composer with the stopped prompt so it can be edited
    const [draft, setDraft] = useState({ key: 0, text: "" })

    const mounted = useRef(false)
    const firstSent = useRef(false)
    const abortRef = useRef<AbortController | null>(null)
    const stopped = useRef(new Set<string>())
    const bottomRef = useRef<HTMLDivElement>(null)

    const parsed = useMemo(() => {
        const map = new Map<string, ParsedMessage>()
        for (const m of messages) if (m.role === "assistant") map.set(m.id, parseMessage(m.id, m.content))
        return map
    }, [messages])

    const openArtifact = open ? parsed.get(open.messageId)?.artifact ?? null : null

    const openLatest = useCallback((reply: Message) => {
        const artifact = artifactOf(reply)
        if (artifact) setOpen({ messageId: reply.id, path: artifact.files[0].path })
    }, [])

    // The POST can outlive our patience (the chat service waits up to 60s on the
    // agent) and the agent can still finish after a timeout, so the source of truth
    // is the message list: poll until the reply with our requestId shows up.
    const pollReply = useCallback(
        async (requestId: string, content: string) => {
            setWaiting(requestId)
            const deadline = Date.now() + POLL_FOR_MS
            while (Date.now() < deadline) {
                await sleep(POLL_EVERY_MS)
                if (!mounted.current || stopped.current.has(requestId)) return
                let list: Message[]
                try {
                    list = await chatApi.getMessages(conversationId)
                } catch {
                    continue
                }
                if (!mounted.current || stopped.current.has(requestId)) return
                setMessages(list)

                const reply = replyFor(list, requestId)
                if (reply) {
                    setWaiting(null)
                    openLatest(reply)
                    return
                }
                const userMsg = list.find((m) => m.role === "user" && m.request_id === requestId)
                if (!userMsg || userMsg.status === "failed" || userMsg.status === "cancelled") break
            }
            if (!mounted.current || stopped.current.has(requestId)) return
            setWaiting(null)
            setFailed({ requestId, content })
        },
        [conversationId, openLatest]
    )

    const send = useCallback(
        async (content: string, requestId: string = crypto.randomUUID()) => {
            stopped.current.delete(requestId) // a Retry un-stops it
            setFailed(null)
            setWaiting(requestId)
            // show the user's message immediately; replaced by the saved row later
            setMessages((prev) =>
                prev.some((m) => m.role === "user" && m.request_id === requestId)
                    ? prev.map((m) => (m.role === "user" && m.request_id === requestId ? { ...m, status: "pending" } : m))
                    : [
                          ...prev,
                          {
                              id: `temp-${requestId}`,
                              conversation_id: conversationId,
                              role: "user",
                              content,
                              created_at: new Date().toISOString(),
                              request_id: requestId,
                              status: "pending",
                          },
                      ]
            )

            const controller = new AbortController()
            abortRef.current = controller
            try {
                const res = await chatApi.sendMessage(conversationId, content, requestId, controller.signal)
                if (!mounted.current) return
                const reply = res.assistantMessage
                if (res.status === "complete" && reply) {
                    setMessages((prev) => [...prev.filter((m) => m.request_id !== requestId), res.userMessage, reply])
                    setWaiting(null)
                    openLatest(reply)
                    return
                }
            } catch (error) {
                if (axios.isCancel(error)) return // the user pressed Stop
                // timeout / 5xx — the agent may still answer, so fall through to polling
            } finally {
                if (abortRef.current === controller) abortRef.current = null
            }
            if (stopped.current.has(requestId)) return
            await pollReply(requestId, content)
        },
        [conversationId, pollReply, openLatest]
    )

    // Stop: the UI stops instantly; the backend cancel (agent abort) runs in the background
    const stop = useCallback(() => {
        if (!waiting) return
        const requestId = waiting
        stopped.current.add(requestId)
        abortRef.current?.abort()
        setWaiting(null)

        const stoppedMsg = messages.find((m) => m.role === "user" && m.request_id === requestId)
        setMessages((prev) =>
            prev.map((m) => (m.role === "user" && m.request_id === requestId ? { ...m, status: "cancelled" } : m))
        )
        if (stoppedMsg) setDraft((d) => ({ key: d.key + 1, text: stoppedMsg.content }))

        chatApi.cancelMessage(conversationId, requestId).catch(() => {
            /* the message may not be saved yet or already answered — nothing to undo */
        })
    }, [waiting, messages, conversationId])

    // Esc stops generation
    useEffect(() => {
        if (!waiting) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") stop()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [waiting, stop])

    useEffect(() => {
        mounted.current = true
        let cancelled = false
        const state = location.state as RouteState

        // drop the router state so a page refresh doesn't resend the first message
        if (state?.firstMessage) navigate(location.pathname, { replace: true, state: null })

        chatApi
            .getMessages(conversationId)
            .then((list) => {
                if (cancelled) return
                setMessages(list)
                setLoading(false)

                if (state?.firstMessage && !firstSent.current) {
                    firstSent.current = true
                    void send(state.firstMessage, state.requestId)
                    return
                }

                // came back mid-answer (refresh, or opened from the sidebar): resume
                const lastUser = [...list].reverse().find((m) => m.role === "user")
                if (!lastUser?.request_id || replyFor(list, lastUser.request_id)) return
                if (lastUser.status === "pending") void pollReply(lastUser.request_id, lastUser.content)
                else if (lastUser.status === "failed") setFailed({ requestId: lastUser.request_id, content: lastUser.content })
            })
            .catch(() => {
                if (cancelled) return
                setLoadError("Couldn't load this conversation.")
                setLoading(false)
            })

        return () => {
            cancelled = true
            mounted.current = false
            abortRef.current?.abort()
        }
        // runs once per conversation (the component is keyed by id); the router
        // state is read only on entry on purpose
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId])

    useLayoutEffect(() => {
        bottomRef.current?.scrollIntoView({ block: "end" })
    }, [messages, waiting, failed])

    if (loadError) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <AlertCircle className="size-6 text-destructive" />
                <p>{loadError}</p>
                <Link to="/home" className="text-foreground underline underline-offset-4">
                    Back home
                </Link>
            </div>
        )
    }

    return (
        <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
                        {loading && (
                            <div className="flex justify-center py-10 text-muted-foreground">
                                <Loader2 className="size-5 animate-spin" aria-label="Loading messages" />
                            </div>
                        )}

                        {messages.map((m) =>
                            m.role === "user" ? (
                                <div key={m.id} className="flex flex-col items-end gap-1">
                                    <p
                                        className={`max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 whitespace-pre-wrap text-foreground ${
                                            m.status === "cancelled" ? "opacity-60" : ""
                                        }`}
                                    >
                                        {m.content}
                                    </p>
                                    {m.status === "cancelled" && <span className="text-xs text-muted-foreground">Stopped</span>}
                                </div>
                            ) : (
                                <div key={m.id} className="flex gap-3">
                                    <Sparkles className="mt-1 size-5 shrink-0 text-lime-accent" aria-hidden="true" />
                                    <MessageContent
                                        parsed={parsed.get(m.id) ?? parseMessage(m.id, m.content)}
                                        isOpen={open?.messageId === m.id}
                                        onOpenFile={(path) => setOpen({ messageId: m.id, path })}
                                    />
                                </div>
                            )
                        )}

                        {waiting && (
                            <div className="flex items-center gap-3 text-muted-foreground" role="status">
                                <Sparkles className="size-5 shrink-0 animate-pulse text-lime-accent" aria-hidden="true" />
                                <span className="text-sm">Thinking…</span>
                            </div>
                        )}

                        {failed && !waiting && (
                            <div
                                role="alert"
                                className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 px-4 py-3 text-sm"
                            >
                                <span className="text-destructive">The assistant didn't respond.</span>
                                <button
                                    type="button"
                                    onClick={() => void send(failed.content, failed.requestId)}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-foreground hover:bg-muted"
                                >
                                    <RotateCcw className="size-3.5" />
                                    Retry
                                </button>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>
                </div>

                <div className="shrink-0 px-4 pb-4">
                    <div className="mx-auto w-full max-w-3xl">
                        <Composer
                            key={draft.key}
                            defaultText={draft.text}
                            onSubmit={(text) => void send(text)}
                            onStop={waiting ? stop : undefined}
                            busy={!!waiting || loading}
                            placeholder="Reply…"
                        />
                    </div>
                </div>
            </div>

            {open && openArtifact && (
                <ArtifactPanel
                    artifact={openArtifact}
                    activePath={open.path}
                    onSelectFile={(path) => setOpen({ messageId: open.messageId, path })}
                    onClose={() => setOpen(null)}
                />
            )}
        </div>
    )
}
