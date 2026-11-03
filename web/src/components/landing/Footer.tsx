import openaiLogo from "../../assets/openai.png"
import anthropicLogo from "../../assets/anthropic.png"
import geminiLogo from "../../assets/gemini-color.png"
import claudeLogo from "../../assets/claude-color.png"
import deepseekLogo from "../../assets/deepseek-color.png"
import coin from "../../assets/optimized/coin.webp"

const columns = [
    {
        title: "Product",
        links: [
            { label: "Agents", href: "#agents" },
            { label: "How it works", href: "#how-it-works" },
            { label: "Pricing", href: "#pricing" },
            { label: "Changelog", href: "#top" },
        ],
    },
    {
        title: "Resources",
        links: [
            { label: "Documentation", href: "#top" },
            { label: "API reference", href: "#top" },
            { label: "Status", href: "#top" },
            { label: "Community", href: "#top" },
        ],
    },
    {
        title: "Legal",
        links: [
            { label: "Privacy", href: "#top" },
            { label: "Terms", href: "#top" },
            { label: "Security", href: "#top" },
            { label: "DPA", href: "#top" },
        ],
    },
]

const logos = [
    { src: openaiLogo, name: "OpenAI" },
    { src: anthropicLogo, name: "Anthropic" },
    { src: geminiLogo, name: "Gemini" },
    { src: claudeLogo, name: "Claude" },
    { src: deepseekLogo, name: "DeepSeek" },
]

export function Footer() {
    return (
        <footer className="relative overflow-hidden border-t border-sage-900/8 bg-sage-50">
            {/* the coin as a faded ornament */}
            <img
                src={coin}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="pointer-events-none absolute -top-10 -right-16 size-64 rotate-12 opacity-20 select-none sm:-right-6 sm:size-80"
            />

            <div className="relative mx-auto max-w-6xl px-6 py-16">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <p className="text-lg font-bold tracking-tight text-sage-900">
                            openbuilder
                        </p>
                        <p className="mt-3 max-w-xs text-sm leading-relaxed text-sage-800/80">
                            An AI multi-agent studio. One router, six specialists, one
                            continuous thread.
                        </p>

                        <ul className="mt-6 flex items-center gap-3">
                            {logos.map(({ src, name }) => (
                                <li key={name}>
                                    <span className="inline-flex size-8 items-center justify-center rounded-lg border border-sage-900/8 bg-white p-1.5">
                                        <img
                                            src={src}
                                            alt={`${name} logo`}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-full object-contain"
                                        />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {columns.map((column) => (
                        <nav key={column.title} aria-label={column.title}>
                            <h2 className="text-sm font-semibold text-sage-900">
                                {column.title}
                            </h2>
                            <ul className="mt-4 space-y-3">
                                {column.links.map((link) => (
                                    <li key={link.label}>
                                        <a
                                            href={link.href}
                                            className="inline-flex min-h-8 items-center rounded-md text-sm text-sage-800/80 transition-colors hover:text-sage-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sage-700"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>
            </div>

            {/* oversized wordmark, like the reference */}
            <div aria-hidden="true" className="overflow-hidden px-6 pb-6 select-none">
                <p className="bg-[linear-gradient(to_top,var(--color-lime-accent),var(--color-sage-300))] bg-clip-text text-center text-[clamp(3.5rem,17vw,15rem)] leading-[0.8] font-bold tracking-tighter text-transparent">
                    openbuilder
                </p>
            </div>

            <div className="relative border-t border-sage-900/8">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-sage-800/70 sm:flex-row">
                    <p>© {new Date().getFullYear()} openbuilder. All rights reserved.</p>
                    <p>Built with Love ❤️</p>
                </div>
            </div>
        </footer>
    )
}
