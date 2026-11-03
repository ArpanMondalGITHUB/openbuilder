import { Check, Gauge, Scale, ShieldCheck, Zap } from "lucide-react"

const badges = [
    { Icon: Zap, label: "Performance" },
    { Icon: ShieldCheck, label: "Privacy" },
    { Icon: Scale, label: "Scalability" },
]

export function HowItWorks() {
    return (
        <section id="how-it-works" className="scroll-mt-20 py-24 sm:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="eyebrow">How it works</span>
                    <h2 className="mt-5 text-balance text-3xl font-bold text-sage-900 sm:text-5xl">
                        One platform. Complete AI control.
                    </h2>
                    <p className="mt-5 text-balance text-base leading-relaxed text-sage-800/80 sm:text-lg">
                        openbuilder is a set of small services behind one gateway. Each part
                        does one job well, and you always know which one answered.
                    </p>
                </div>

                <div className="mt-14 grid gap-5 lg:grid-cols-2">
                    <article className="surface-card overflow-hidden p-7 sm:p-9">
                        <h3 className="text-balance text-2xl font-bold text-sage-900">
                            Get smarter results — automatically.
                        </h3>
                        <p className="mt-4 text-sm leading-relaxed text-sage-800/80">
                            The router reads your intent on every single message and picks
                            the specialist. You get the focused answer instead of a general
                            model hedging.
                        </p>

                        <ul className="mt-7 space-y-3">
                            {[
                                "Intent is classified before the agent runs",
                                "Full conversation history is carried into every turn",
                                "Late or failed replies retry against the same attempt",
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-3 text-sm text-sage-800">
                                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-sage-200 text-sage-800">
                                        <Check className="size-3" aria-hidden="true" />
                                    </span>
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <div className="mt-9 flex items-center gap-6 rounded-2xl bg-sage-50 p-6">
                            <div
                                aria-hidden="true"
                                className="relative flex size-28 shrink-0 items-center justify-center rounded-full bg-[conic-gradient(var(--color-sage-500)_0deg,var(--color-sage-500)_216deg,var(--color-sage-200)_216deg_360deg)]"
                            >
                                <div className="flex size-[5.5rem] flex-col items-center justify-center rounded-full bg-white">
                                    <span className="text-2xl font-bold text-sage-900">60%</span>
                                </div>
                            </div>
                            <p className="text-sm leading-relaxed text-sage-800/85">
                                <span className="block font-semibold text-sage-900">
                                    Faster agent routing
                                </span>
                                than picking a tool by hand, measured across routing,
                                retries and streamed responses.
                            </p>
                        </div>
                    </article>

                    <article className="surface-card overflow-hidden p-7 sm:p-9">
                        <h3 className="text-balance text-2xl font-bold text-sage-900">
                            Fast, private, reliable. You can trust it.
                        </h3>
                        <p className="mt-4 text-sm leading-relaxed text-sage-800/80">
                            A gateway verifies who you are on every request. Your identity
                            never travels in a body field, and nothing reaches a service
                            that has not been checked.
                        </p>

                        <ul className="mt-7 space-y-3">
                            {[
                                "Every request is verified at the gateway",
                                "Conversations are scoped to the signed-in user",
                                "Retries reuse the original attempt instead of duplicating it",
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-3 text-sm text-sage-800">
                                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-sage-200 text-sage-800">
                                        <Check className="size-3" aria-hidden="true" />
                                    </span>
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <div className="mt-9 flex flex-col gap-3 rounded-2xl bg-sage-50 p-6 sm:flex-row">
                            {badges.map(({ Icon, label }) => (
                                <div
                                    key={label}
                                    className="flex flex-1 items-center gap-2.5 rounded-xl border border-sage-900/8 bg-white px-4 py-3"
                                >
                                    <Icon className="size-4 shrink-0 text-sage-600" aria-hidden="true" />
                                    <span className="text-sm font-medium text-sage-900">
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </article>
                </div>

                <div className="surface-card mt-5 flex flex-col items-start gap-6 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
                    <div className="flex items-start gap-4">
                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-sage-700">
                            <Gauge className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                            <h3 className="text-lg font-semibold text-sage-900">
                                See the whole architecture
                            </h3>
                            <p className="mt-1 max-w-xl text-sm leading-relaxed text-sage-800/80">
                                Gateway, auth, chat and agent services — each one separate,
                                each one doing a single job. Read how the pieces fit
                                together.
                            </p>
                        </div>
                    </div>
                    <a href="#pricing" className="btn-pill-light w-full shrink-0 sm:w-auto">
                        Read the docs
                    </a>
                </div>
            </div>
        </section>
    )
}
