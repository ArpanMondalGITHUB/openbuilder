import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"

const links = [
    { label: "Product", href: "#agents" },
    { label: "Agents", href: "#agents" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
]

export function Nav() {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (!open) return
        const onResize = () => setOpen(false)
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [open])

    return (
        <header className="sticky top-0 z-50 border-b border-sage-900/8 bg-background/85 backdrop-blur-xl">
            <nav
                aria-label="Main"
                className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6"
            >
                <a
                    href="#top"
                    className="text-lg font-bold tracking-tight text-sage-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sage-700"
                >
                    openbuilder
                </a>

                <ul className="hidden items-center gap-8 md:flex">
                    {links.map((link) => (
                        <li key={link.label}>
                            <a
                                href={link.href}
                                className="rounded-md text-sm font-medium text-sage-800/80 transition-colors hover:text-sage-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sage-700"
                            >
                                {link.label}
                            </a>
                        </li>
                    ))}
                </ul>

                <div className="hidden items-center gap-3 md:flex">
                    <a
                        href="#pricing"
                        className="rounded-full px-4 py-2 text-sm font-medium text-sage-900 transition-colors hover:text-sage-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sage-700"
                    >
                        Sign in
                    </a>
                    <a href="#pricing" className="btn-pill-dark">
                        Start building
                    </a>
                </div>

                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-controls="mobile-menu"
                    aria-label={open ? "Close menu" : "Open menu"}
                    className="inline-flex size-11 items-center justify-center rounded-full text-sage-900 transition-colors hover:bg-sage-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-700 md:hidden"
                >
                    {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
                </button>
            </nav>

            {open && (
                <div id="mobile-menu" className="border-t border-sage-900/8 bg-background md:hidden">
                    <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
                        {links.map((link) => (
                            <li key={link.label}>
                                <a
                                    href={link.href}
                                    onClick={() => setOpen(false)}
                                    className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-sage-900 transition-colors hover:bg-sage-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-700"
                                >
                                    {link.label}
                                </a>
                            </li>
                        ))}
                        <li className="mt-2 flex flex-col gap-2">
                            <a
                                href="#pricing"
                                onClick={() => setOpen(false)}
                                className="btn-pill-light w-full"
                            >
                                Sign in
                            </a>
                            <a
                                href="#pricing"
                                onClick={() => setOpen(false)}
                                className="btn-pill-dark w-full"
                            >
                                Start building
                            </a>
                        </li>
                    </ul>
                </div>
            )}
        </header>
    )
}
