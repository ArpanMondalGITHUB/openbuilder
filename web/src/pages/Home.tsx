import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Sparkles } from "lucide-react"
import chatApi from "../api/chat.api"
import Composer from "../components/home/Composer"
import { useShell } from "../components/home/shell.context"

const greeting = () => {
    const h = new Date().getHours()
    if (h < 5) return "Up late"
    if (h < 12) return "Morning"
    if (h < 17) return "Afternoon"
    return "Evening"
}

const timeAgo = (iso: string) => {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return "just now"
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function Home() {
    const navigate = useNavigate()
    const { user, conversations, loadingConversations, addConversation } = useShell()
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Only create the conversation here (fast). The chat page sends the message,
    // so the user is redirected right away instead of waiting on the agent.
    const handleSend = async (text: string) => {
        setCreating(true)
        setError(null)
        try {
            const title = text.length > 60 ? `${text.slice(0, 57)}…` : text
            const convo = await chatApi.createConversation(title)
            addConversation(convo)
            navigate(`/chat/${convo.id}`, { state: { firstMessage: text, requestId: crypto.randomUUID() } })
            return true
        } catch {
            setError("Couldn't start a conversation. Try again.")
            setCreating(false)
            return false
        }
    }

    const firstName = user?.name?.split(" ")[0] ?? "there"
    const recent = conversations.slice(0, 4)

    return (
        <section className="flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 pt-6 pb-16">
                <h1 className="mb-8 flex items-center justify-center gap-3 text-center text-4xl font-normal text-foreground sm:text-5xl">
                    <Sparkles className="size-9 shrink-0 text-lime-accent sm:size-10" aria-hidden="true" />
                    <span className="text-balance">
                        {greeting()}, {firstName}
                    </span>
                </h1>

                <Composer onSubmit={handleSend} busy={creating} />

                {error && (
                    <p role="alert" className="mt-3 text-center text-sm text-destructive">
                        {error}
                    </p>
                )}

                <div className="mt-12">
                    <h2 className="mb-3 px-2 text-sm font-medium text-muted-foreground">Recent chats</h2>

                    {loadingConversations ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-36 animate-pulse rounded-xl bg-card" />
                            ))}
                        </div>
                    ) : recent.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                            Your recent work will show up here.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {recent.map((c) => (
                                <Link
                                    key={c.id}
                                    to={`/chat/${c.id}`}
                                    className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-ring/50"
                                >
                                    <div className="h-20 bg-linear-to-br from-sage-700 via-sage-800 to-sage-900 p-3">
                                        <p className="line-clamp-3 text-[11px] leading-snug text-sage-100/70">{c.title}</p>
                                    </div>
                                    <div className="p-3">
                                        <p className="truncate text-sm text-card-foreground">{c.title}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(c.created_at)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
