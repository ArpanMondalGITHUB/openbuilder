import type { ComponentType } from "react"
import {
    ChevronDown,
    Clock,
    FolderClosed,
    LayoutGrid,
    LogOut,
    MessageCircle,
    PanelLeft,
    Plus,
    Search,
    SlidersHorizontal,
} from "lucide-react"
import type { Conversation } from "../../api/chat.api"
import type { User } from "../../types/user"

type NavItem = { label: string; icon: ComponentType<{ className?: string }> }

const navItems: NavItem[] = [
    { label: "Search", icon: Search },
    { label: "Projects", icon: FolderClosed },
    { label: "Artifacts", icon: LayoutGrid },
    { label: "Scheduled", icon: Clock },
]

interface SidebarProps {
    open: boolean
    onToggle: () => void
    onNew: () => void
    onSelect: (id: string) => void
    onLogout: () => void
    activeId: string | null
    user: User | null
    conversations: Conversation[]
    loading: boolean
}

export default function Sidebar({
    open,
    onToggle,
    onNew,
    onSelect,
    onLogout,
    activeId,
    user,
    conversations,
    loading,
}: SidebarProps) {
    const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? "?"

    return (
        <>
            {/* backdrop on small screens */}
            <div
                className={`fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
                onClick={onToggle}
                aria-hidden="true"
            />

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:translate-x-0 ${
                    open ? "translate-x-0" : "-translate-x-full md:hidden"
                }`}
            >
                <div className="flex h-14 items-center gap-2 px-3">
                    <button type="button" onClick={onToggle} className="icon-btn" aria-label="Close sidebar">
                        <PanelLeft className="size-4.5" />
                    </button>
                    <span className="text-lg font-semibold tracking-tight">OpenBuilder</span>
                </div>

                <nav className="flex flex-col gap-0.5 px-2">
                    <button type="button" onClick={onNew} className="side-item font-medium">
                        <Plus className="size-4.5" />
                        New chat
                    </button>
                    {navItems.map(({ label, icon: Icon }) => (
                        <button key={label} type="button" className="side-item">
                            <Icon className="size-4.5" />
                            {label}
                        </button>
                    ))}
                    <button type="button" className="side-item">
                        <SlidersHorizontal className="size-4.5" />
                        Customize
                    </button>
                </nav>

                <div className="mt-6 flex items-center justify-between px-4 text-xs font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        Recents <ChevronDown className="size-3.5" />
                    </span>
                </div>

                <ul className="mt-1 flex-1 overflow-y-auto px-2 pb-2">
                    {loading &&
                        Array.from({ length: 5 }).map((_, i) => (
                            <li key={i} className="mx-2 my-2.5 h-4 animate-pulse rounded bg-sidebar-accent" />
                        ))}
                    {!loading && conversations.length === 0 && (
                        <li className="px-3 py-2 text-sm text-muted-foreground">No conversations yet</li>
                    )}
                    {conversations.map((c) => (
                        <li key={c.id}>
                            <button
                                type="button"
                                onClick={() => onSelect(c.id)}
                                aria-current={c.id === activeId ? "page" : undefined}
                                className={`side-item w-full ${c.id === activeId ? "bg-sidebar-accent text-sidebar-foreground" : ""}`}
                                title={c.title}
                            >
                                <MessageCircle className="size-4 shrink-0 opacity-60" />
                                <span className="truncate">{c.title}</span>
                            </button>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center gap-3 border-t border-sidebar-border p-3">
                    <span className="grid size-8 place-items-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                        {initial}
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-sm font-medium">{user?.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <button type="button" onClick={onLogout} className="icon-btn" aria-label="Sign out" title="Sign out">
                        <LogOut className="size-4" />
                    </button>
                </div>
            </aside>
        </>
    )
}
