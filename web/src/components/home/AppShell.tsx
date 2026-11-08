import { useCallback, useEffect, useState } from "react"
import { Navigate, Outlet, useMatch, useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { Loader2, MessageSquareDashed, PanelLeft } from "lucide-react"
import { checkCurrentUser, logout } from "../../store/slice/authSlice"
import type { AppDispatch, RootState } from "../../store/store"
import type { ShellContext } from "./shell.context"
import chatApi, { type Conversation } from "../../api/chat.api"
import Sidebar from "./Sidebar"

const isDesktop = () => window.matchMedia("(min-width: 768px)").matches

// Layout for every signed-in page: auth gate, sidebar, top bar. The conversation
// list lives here so it survives navigating between /home and /chat/:id.
export default function AppShell() {
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()
    const user = useSelector((s: RootState) => s.auth.user)
    const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated)
    const authChecked = useSelector((s: RootState) => s.auth.authChecked)

    const chatMatch = useMatch("/chat/:conversationId")
    const activeId = chatMatch?.params.conversationId ?? null

    const [sidebarOpen, setSidebarOpen] = useState(isDesktop)
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [loadingConversations, setLoadingConversations] = useState(true)

    useEffect(() => {
        dispatch(checkCurrentUser())
    }, [dispatch])

    // fetched once per sign-in; new conversations are prepended locally, no refetch
    useEffect(() => {
        if (!isAuthenticated) return
        let cancelled = false
        chatApi
            .listConversations()
            .then((list) => !cancelled && setConversations(list))
            .catch(() => {})
            .finally(() => !cancelled && setLoadingConversations(false))
        return () => {
            cancelled = true
        }
    }, [isAuthenticated])

    const addConversation = useCallback((c: Conversation) => {
        setConversations((prev) => [c, ...prev.filter((p) => p.id !== c.id)])
    }, [])

    const go = (path: string) => {
        navigate(path)
        if (!isDesktop()) setSidebarOpen(false)
    }

    if (!authChecked) {
        return (
            <div className="dark flex min-h-screen items-center justify-center bg-background text-muted-foreground">
                <Loader2 className="size-5 animate-spin" aria-label="Loading" />
            </div>
        )
    }

    if (!isAuthenticated) return <Navigate to="/auth" replace />

    const title = activeId ? conversations.find((c) => c.id === activeId)?.title : undefined
    const context: ShellContext = { user, conversations, loadingConversations, addConversation }

    return (
        <div className="dark flex h-dvh overflow-hidden bg-background text-foreground">
            <Sidebar
                open={sidebarOpen}
                onToggle={() => setSidebarOpen((o) => !o)}
                onNew={() => go("/home")}
                onSelect={(id) => go(`/chat/${id}`)}
                onLogout={() => dispatch(logout())}
                activeId={activeId}
                user={user}
                conversations={conversations}
                loading={loadingConversations}
            />

            <main className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-14 shrink-0 items-center gap-2 px-3">
                    {!sidebarOpen && (
                        <button type="button" onClick={() => setSidebarOpen(true)} className="icon-btn" aria-label="Open sidebar">
                            <PanelLeft className="size-4.5" />
                        </button>
                    )}
                    <p className="min-w-0 flex-1 truncate text-sm text-foreground/90">{title}</p>
                    <button type="button" className="icon-btn" aria-label="Temporary chat" title="Temporary chat">
                        <MessageSquareDashed className="size-4.5" />
                    </button>
                </header>

                <div className="flex min-h-0 flex-1 flex-col">
                    <Outlet context={context} />
                </div>
            </main>
        </div>
    )
}
