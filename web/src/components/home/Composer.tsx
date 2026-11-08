import { useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { ArrowUp, AudioLines, ChevronDown, Loader2, Mic, Plus, Square } from "lucide-react"

const models = ["GPT", "Claude", "Gemini", "DeepSeek"] as const

interface ComposerProps {
    // return false to put the text back (e.g. the request failed)
    onSubmit: (text: string) => Promise<boolean | void> | boolean | void
    // when set and busy, the send button becomes a Stop button
    onStop?: () => void
    busy: boolean
    placeholder?: string
    // starting text (e.g. the prompt the user just stopped, so they can fix it)
    defaultText?: string
}

export default function Composer({
    onSubmit,
    onStop,
    busy,
    placeholder = "How can I help you today?",
    defaultText = "",
}: ComposerProps) {
    const [text, setText] = useState(defaultText)
    const [model, setModel] = useState<(typeof models)[number]>("Claude")
    const ref = useRef<HTMLTextAreaElement>(null)

    const submit = async (e?: FormEvent) => {
        e?.preventDefault()
        const value = text.trim()
        if (!value || busy) return
        setText("")
        if (ref.current) ref.current.style.height = "auto"
        const ok = await onSubmit(value)
        if (ok === false) setText(value)
    }

    // Enter sends, Shift+Enter makes a newline
    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            void submit()
        }
    }

    const autoGrow = (el: HTMLTextAreaElement) => {
        el.style.height = "auto"
        el.style.height = `${Math.min(el.scrollHeight, 240)}px`
    }

    const canSend = text.trim().length > 0 && !busy

    return (
        <div className="w-full">
            <form
                onSubmit={submit}
                className="rounded-2xl border border-border bg-card shadow-[0_8px_30px_-12px_rgb(0_0_0/0.5)] transition-colors focus-within:border-ring/60"
            >
                <label htmlFor="composer" className="sr-only">
                    Message
                </label>
                <textarea
                    id="composer"
                    ref={ref}
                    rows={2}
                    value={text}
                    autoFocus
                    onChange={(e) => {
                        setText(e.target.value)
                        autoGrow(e.target)
                    }}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    className="block w-full resize-none bg-transparent px-5 pt-4 text-base text-card-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <div className="flex items-center justify-between px-3 pb-3">
                    <button type="button" className="icon-btn" aria-label="Add attachment">
                        <Plus className="size-5" />
                    </button>
                    <div className="flex items-center gap-1">
                        <button type="button" className="icon-btn" aria-label="Dictate">
                            <Mic className="size-4.5" />
                        </button>
                        {busy && onStop ? (
                            <button
                                type="button"
                                onClick={onStop}
                                className="grid size-8 place-items-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-90"
                                aria-label="Stop generating"
                                title="Stop (Esc)"
                            >
                                <Square className="size-3.5 fill-current" />
                            </button>
                        ) : canSend || busy ? (
                            <button
                                type="submit"
                                disabled={!canSend}
                                className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                                aria-label="Send message"
                            >
                                {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                            </button>
                        ) : (
                            <button type="button" className="icon-btn" aria-label="Voice mode">
                                <AudioLines className="size-4.5" />
                            </button>
                        )}
                    </div>
                </div>
            </form>

            <div className="mt-3 flex items-center justify-between px-2 text-sm">
                <button type="button" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-foreground/90 hover:bg-muted">
                    Project <ChevronDown className="size-3.5" />
                </button>
                <label className="relative inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted">
                    <span className="sr-only">Model</span>
                    <select
                        value={model}
                        onChange={(e) => setModel(e.target.value as (typeof models)[number])}
                        className="cursor-pointer appearance-none bg-transparent pr-4 text-foreground/90 focus:outline-none"
                    >
                        {models.map((m) => (
                            <option key={m} value={m} className="bg-popover text-popover-foreground">
                                {m}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 size-3.5" />
                </label>
            </div>
        </div>
    )
}
