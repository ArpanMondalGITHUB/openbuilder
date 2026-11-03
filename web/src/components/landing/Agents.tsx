import { ArrowRight, Code2, FileText, Gauge, Image, Layers, MessageCircle, Presentation, Search, ShieldCheck, Sparkles } from "lucide-react"
import chair from "../../assets/optimized/chair.webp"
import agentshill from "../../assets/optimized/agents-hill.webp"

const models = ["Gemini 2.5 Flash", "Gemini 2.5 Pro", "GPT-4o", "Claude 3.5"]

const agents = [
    { Icon: MessageCircle, name: "Chat", blurb: "Everyday conversation, explanations and ideas." },
    { Icon: Search, name: "Search", blurb: "Anything that needs facts you do not want to guess." },
    { Icon: Code2, name: "Coding", blurb: "Writing, debugging and explaining code." },
    { Icon: FileText, name: "Document", blurb: "Reports and long-form document content." },
    { Icon: Presentation, name: "Deck", blurb: "Slide decks, outlines and presentation copy." },
    { Icon: Image, name: "Image", blurb: "Prompts and briefs for generated visuals." },
]

export function Agents() {
    return (
        <section id="agents" className="relative scroll-mt-20 py-24 sm:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="eyebrow">Features</span>
                    <h2 className="mt-5 text-balance text-3xl font-bold text-sage-900 sm:text-5xl">
                        One platform. Multiple agents.
                    </h2>
                    <p className="mt-5 text-balance text-base leading-relaxed text-sage-800/80 sm:text-lg">
                        Every request passes through a router that reads what you actually
                        need, then hands it to the specialist built for that job.
                    </p>
                </div>

                <div className="mt-14 grid gap-5 lg:grid-cols-3">
                    {/* all models */}
                    <article className="surface-card relative overflow-hidden p-7 lg:col-span-2">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-16 -bottom-24 size-72 rounded-full bg-[radial-gradient(closest-side,var(--color-sage-200),transparent_70%)] blur-2xl"
                        />
                        <div className="relative grid gap-8 sm:grid-cols-[1fr_auto] sm:items-start">
                            <div>
                                <h3 className="text-xl font-semibold text-sage-900">
                                    All models, one place
                                </h3>
                                <p className="mt-3 max-w-md text-sm leading-relaxed text-sage-800/80">
                                    Swap between Gemini, GPT and Claude without changing
                                    tools. openbuilder keeps the conversation, the files
                                    and the history in one thread.
                                </p>

                                <ul className="mt-6 flex flex-wrap gap-2">
                                    {models.map((model) => (
                                        <li
                                            key={model}
                                            className="rounded-full border border-sage-900/10 bg-sage-50 px-3.5 py-1.5 text-xs font-medium text-sage-800"
                                        >
                                            {model}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* the featured visual */}
                            <div className="relative mx-auto w-40 shrink-0 sm:mx-0 sm:w-48">
                                <div
                                    aria-hidden="true"
                                    className="absolute inset-x-0 bottom-0 h-16 rounded-[50%] bg-[radial-gradient(closest-side,var(--color-sage-300),transparent_72%)] blur-xl"
                                />
                                <img
                                    src={chair}
                                    alt="A wooden director's chair on a white studio background"
                                    loading="lazy"
                                    decoding="async"
                                    className="relative w-full mix-blend-multiply"
                                />
                            </div>
                        </div>
                    </article>

                    {/* private */}
                    <article className="surface-card flex flex-col justify-between p-7">
                        <div>
                            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-sage-100 text-sage-700">
                                <ShieldCheck className="size-5" aria-hidden="true" />
                            </span>
                            <h3 className="mt-5 text-xl font-semibold text-sage-900">
                                Private and secure
                            </h3>
                            <p className="mt-3 text-sm leading-relaxed text-sage-800/80">
                                Your code, keys and conversations stay in your workspace.
                                Nothing leaks into another tenant.
                            </p>
                        </div>
                        <a
                            href="#how-it-works"
                            className="mt-6 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-sage-800 transition-colors hover:text-sage-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sage-700"
                        >
                            How we protect it
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </a>
                    </article>

                    {/* router */}
                    <article className="surface-card p-7">
                        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-sage-100 text-sage-700">
                            <Sparkles className="size-5" aria-hidden="true" />
                        </span>
                        <h3 className="mt-5 text-xl font-semibold text-sage-900">
                            A router that gets it right
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-sage-800/80">
                            A model reads your intent and picks the agent — so a coding
                            question never lands on the image generator.
                        </p>
                        <img
                            src={agentshill}
                            alt="A wooden director's chair on a white studio background"
                            loading="lazy"
                            decoding="async"
                            className="relative w-full mix-blend-multiply"
                        />
                    </article>

                    {/* agents */}
                    <article className="surface-card p-7 lg:col-span-2">
                        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-sage-100 text-sage-700">
                            <Layers className="size-5" aria-hidden="true" />
                        </span>
                        <h3 className="mt-5 text-xl font-semibold text-sage-900">
                            Six specialists, one thread
                        </h3>
                        <p className="mt-3 max-w-lg text-sm leading-relaxed text-sage-800/80">
                            Each agent is tuned for its job and shares the same context, so
                            switching from research to code never loses the thread.
                        </p>

                        <ul className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                            {agents.map(({ Icon, name, blurb }) => (
                                <li key={name} className="flex gap-3.5">
                                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-sage-700">
                                        <Icon className="size-4" aria-hidden="true" />
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold text-sage-900">
                                            {name}
                                        </span>
                                        <span className="mt-0.5 block text-sm leading-relaxed text-sage-800/75">
                                            {blurb}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </article>
                </div>

                <div className="surface-card mt-5 flex flex-col items-start gap-5 p-7 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-sage-700">
                            <Gauge className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                            <h3 className="text-lg font-semibold text-sage-900">
                                Fast, private, reliable
                            </h3>
                            <p className="mt-1 text-sm text-sage-800/80">
                                Responses stream back as they are generated, and every turn is
                                saved so you can pick it up on any device.
                            </p>
                        </div>
                    </div>
                    <a href="#pricing" className="btn-lime w-full shrink-0 sm:w-auto">
                        Get started
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </a>
                </div>
            </div>
        </section>
    )
}
