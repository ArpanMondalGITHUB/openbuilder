import { ArrowRight, FileText, Image as ImageIcon, MessageCircle, Presentation, Search, Code2, Sparkles, Zap, FileSearch, Send } from "lucide-react"
import heroHills from "../../assets/optimized/hero-hills.webp"
import openaiLogo from "../../assets/openai.png"
import anthropicLogo from "../../assets/anthropic.png"
import geminiLogo from "../../assets/gemini-color.png"
import claudeLogo from "../../assets/claude-color.png"
import deepseekLogo from "../../assets/deepseek-color.png"
import perplexityLogo from "../../assets/perplexity-color.png"

// the model logos orbit along an arc above the headline, like the reference
const orbit = [
    { src: openaiLogo, name: "OpenAI", className: "left-[4%] top-[20%] sm:left-[8%] sm:top-[16%]" },
    { src: geminiLogo, name: "Gemini", className: "left-[24%] top-[8%] sm:left-[26%] sm:top-[6%]" },
    { src: anthropicLogo, name: "Anthropic", className: "left-[44%] top-[4%] sm:left-[45%] sm:top-[3%]" },
    { src: claudeLogo, name: "Claude", className: "left-[64%] top-[8%] sm:left-[63%] sm:top-[6%]" },
    { src: deepseekLogo, name: "DeepSeek", className: "left-[82%] top-[18%] sm:left-[80%] sm:top-[14%]" },
    { src: perplexityLogo, name: "Perplexity", className: "right-[2%] top-[34%] sm:right-[5%] sm:top-[26%]" },
]

const pills = [
    { Icon: Sparkles, label: "AI for real work" },
    { Icon: FileSearch, label: "Smart summaries" },
    { Icon: Send, label: "Ask anything, get results" },
    { Icon: Zap, label: "Fast, private, reliable" },
]

const agents = [
    { Icon: MessageCircle, label: "Chat" },
    { Icon: Search, label: "Search" },
    { Icon: Code2, label: "Code" },
    { Icon: FileText, label: "Docs" },
    { Icon: Presentation, label: "Slides" },
    { Icon: ImageIcon, label: "Images" },
]

const proof = [
    { value: "2M+", label: "Tasks completed daily" },
    { value: "6", label: "Specialised agents" },
    { value: "60%", label: "Faster task routing" },
    { value: "99.9%", label: "Uptime" },
]

export function Hero() {
    return (
        <section id="top" className="relative isolate overflow-hidden">
            {/* the landscape */}
            <img
                src={heroHills}
                alt=""
                aria-hidden="true"
                fetchPriority="high"
                decoding="async"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[62%_72%]"
            />
            {/* tint it into the page and fade the top edge */}
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-sage-50)_0%,var(--color-sage-50)/35_18%,transparent_45%,transparent_78%,var(--color-sage-50)_100%)]"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-sage-100/45 mix-blend-multiply" />

            <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-20 sm:pb-24">
                {/* model logos on the arc */}
                {orbit.map(({ src, name, className }) => (
                    <span
                        key={name}
                        className={`animate-float-slow absolute hidden size-12 items-center justify-center rounded-full border border-white/70 bg-white/85 p-2.5 shadow-[0_10px_30px_-12px_oklch(0.235_0.042_140/0.45)] backdrop-blur sm:flex ${className}`}
                    >
                        <img src={src} alt={`${name} logo`} className="h-full w-full object-contain" />
                    </span>
                ))}

                <div className="relative mx-auto max-w-2xl pt-16 text-center sm:pt-24">
                    <span className="eyebrow">
                        <Sparkles className="mr-1.5 inline size-3.5" aria-hidden="true" />
                        Unified access to multiple models
                    </span>

                    <h1 className="mt-6 text-balance text-4xl leading-[1.05] font-bold text-sage-900 sm:text-6xl">
                        Work smarter. Move faster.
                        <br />
                        All AI in one place.
                    </h1>

                    <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-sage-800/85 sm:text-lg">
                        One router, six specialised agents. Every message is classified and
                        handed to the right expert — chat, search, code, documents, decks or
                        images — without you switching tabs.
                    </p>

                    <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <a href="#pricing" className="btn-lime w-full sm:w-auto">
                            Start building free
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </a>
                        <a href="#how-it-works" className="btn-pill-light w-full sm:w-auto">
                            See how it works
                        </a>
                    </div>
                </div>

                {/* glass pill row */}
                <ul className="relative mt-16 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                    {pills.map(({ Icon, label }) => (
                        <li
                            key={label}
                            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-xs font-medium text-sage-800 shadow-sm backdrop-blur sm:text-sm"
                        >
                            <Icon className="size-4 text-sage-600" aria-hidden="true" />
                            {label}
                        </li>
                    ))}
                </ul>

                {/* agent + model strip */}
                <div className="relative mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
                    <ul className="flex flex-wrap items-center justify-center gap-4">
                        {agents.map(({ Icon, label }) => (
                            <li key={label} className="flex items-center gap-1.5 text-xs text-sage-800/80">
                                <Icon className="size-4 text-sage-600" aria-hidden="true" />
                                {label}
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs font-medium text-sage-800/75 sm:text-sm">
                        GPT <span aria-hidden="true">•</span> Claude <span aria-hidden="true">•</span> Gemini{" "}
                        <span aria-hidden="true">•</span> Grok <span aria-hidden="true">•</span> DeepSeek{" "}
                        <span aria-hidden="true">•</span> and more
                    </p>
                </div>

                {/* proof strip */}
                <dl className="relative mt-16 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-sage-900/10 pt-10 sm:grid-cols-4">
                    {proof.map((item) => (
                        <div key={item.label} className="text-center">
                            <dt className="sr-only">{item.label}</dt>
                            <dd>
                                <span className="block text-2xl font-bold text-sage-900 sm:text-3xl">
                                    {item.value}
                                </span>
                                <span className="mt-1 block text-sm text-sage-800/70">
                                    {item.label}
                                </span>
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    )
}
