import { Check } from "lucide-react"
import grass from "../../assets/optimized/pricing-hills.webp"

const plans = [
    {
        name: "Free",
        price: "$0",
        period: "/month",
        blurb: "For trying the whole platform out.",
        features: [
            "20 messages a day",
            "All six agents",
            "1 conversation history",
            "Community support",
        ],
        cta: "Start for free",
        recommended: false,
        crop: "object-[30%_78%]",
    },
    {
        name: "Professional",
        price: "$30",
        period: "/month",
        blurb: "For people who build with AI every day.",
        features: [
            "Unlimited messages",
            "All six agents",
            "Unlimited conversation history",
            "Priority routing",
            "Email support",
        ],
        cta: "Start building",
        recommended: true,
        crop: "object-[50%_82%]",
    },
    {
        name: "Team",
        price: "$80",
        period: "/month",
        blurb: "For small teams shipping with AI.",
        features: [
            "Everything in Professional",
            "5 seats included",
            "Shared workspaces",
            "Usage analytics",
            "Priority support",
        ],
        cta: "Talk to us",
        recommended: false,
        crop: "object-[72%_74%]",
    },
]

export function Pricing() {
    return (
        <section id="pricing" className="scroll-mt-20 bg-sage-50 py-24 sm:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="eyebrow">Pricing</span>
                    <h2 className="mt-5 text-balance text-3xl font-bold text-sage-900 sm:text-5xl">
                        Choose the plan that fits
                    </h2>
                    <p className="mt-5 text-balance text-base leading-relaxed text-sage-800/80 sm:text-lg">
                        Start free. Upgrade when the work demands it. Cancel whenever you
                        want — no lock-in, no contracts.
                    </p>
                </div>

                <div className="mt-14 grid gap-5 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <article
                            key={plan.name}
                            className={`surface-card relative flex flex-col overflow-hidden ${
                                plan.recommended
                                    ? "border-sage-500/40 shadow-[0_1px_2px_oklch(0.235_0.042_140/0.04),0_20px_48px_-20px_oklch(0.405_0.078_138/0.45)]"
                                    : ""
                            }`}
                        >
                            {plan.recommended && (
                                <span className="absolute top-4 left-7 z-10 rounded-full bg-sage-700 px-3 py-1 text-[11px] font-semibold tracking-wide text-sage-50 uppercase">
                                    Recommended
                                </span>
                            )}

                            <div className="p-7 pb-4">
                                <h3 className="text-lg font-semibold text-sage-900">
                                    {plan.name}
                                </h3>
                                <p className="mt-1.5 text-sm text-sage-800/75">{plan.blurb}</p>

                                <p className="mt-6 flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-sage-900">
                                        {plan.price}
                                    </span>
                                    <span className="text-sm text-sage-800/70">
                                        {plan.period}
                                    </span>
                                </p>

                                <ul className="mt-7 flex-1 space-y-3">
                                    {plan.features.map((feature) => (
                                        <li
                                            key={feature}
                                            className="flex items-start gap-3 text-sm text-sage-800"
                                        >
                                            <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-sage-200 text-sage-800">
                                                <Check className="size-3" aria-hidden="true" />
                                            </span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <a
                                    href="#top"
                                    className={`mt-8 w-full ${
                                        plan.recommended ? "btn-lime" : "btn-pill-light"
                                    }`}
                                >
                                    {plan.cta}
                                </a>
                            </div>

                            {/* grass band that grounds the card */}
                            <div className="relative h-20 w-full overflow-hidden">
                                <img
                                    src={grass}
                                    alt=""
                                    aria-hidden="true"
                                    loading="lazy"
                                    decoding="async"
                                    className={`h-full w-full object-cover ${plan.crop}`}
                                />
                                <div
                                    aria-hidden="true"
                                    className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-sage-50)_0%,transparent_45%)]"
                                />
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
