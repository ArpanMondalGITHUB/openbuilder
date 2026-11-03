import { Star } from "lucide-react"

const quotes = [
    {
        quote:
            "We replaced four separate tools with one thread. The router picks the right agent and our engineers stopped copy-pasting between tabs.",
        name: "Priya Raghavan",
        role: "Staff Engineer, Northbeam",
    },
    {
        quote:
            "Set up an account before lunch, had a working document pipeline by the afternoon. The agents are genuinely good at their own jobs.",
        name: "Marcus Delaney",
        role: "Head of Ops, Ledgerly",
    },
]

const stats = [
    { value: "50K+", label: "Tasks routed" },
    { value: "6", label: "Specialised agents" },
    { value: "60%", label: "Faster routing" },
    { value: "99.9%", label: "Uptime" },
]

function Stars() {
    return (
        <div className="flex gap-0.5" aria-label="Rated five out of five">
            {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-4 fill-sage-500 text-sage-500" aria-hidden="true" />
            ))}
        </div>
    )
}

export function Testimonials() {
    return (
        <section className="py-24 sm:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="eyebrow">Testimonials</span>
                    <h2 className="mt-5 text-balance text-3xl font-bold text-sage-900 sm:text-5xl">
                        Trusted by teams. Powered by AI.
                    </h2>
                    <p className="mt-5 text-balance text-base leading-relaxed text-sage-800/80 sm:text-lg">
                        Thousands of conversations run through openbuilder every day. Here
                        is what changed for the people building with it.
                    </p>
                </div>

                <div className="mt-14 grid gap-5 lg:grid-cols-2">
                    {quotes.map((item) => (
                        <figure key={item.name} className="surface-card flex flex-col p-7 sm:p-9">
                            <Stars />
                            <blockquote className="mt-5 text-pretty text-base leading-relaxed text-sage-900">
                                “{item.quote}”
                            </blockquote>
                            <figcaption className="mt-6 flex items-center gap-3">
                                <span
                                    aria-hidden="true"
                                    className="inline-flex size-10 items-center justify-center rounded-full bg-[linear-gradient(140deg,var(--color-sage-200),var(--color-sage-400))] text-sm font-bold text-sage-900"
                                >
                                    {item.name
                                        .split(" ")
                                        .map((part) => part[0])
                                        .join("")}
                                </span>
                                <span>
                                    <span className="block text-sm font-semibold text-sage-900">
                                        {item.name}
                                    </span>
                                    <span className="block text-sm text-sage-800/75">
                                        {item.role}
                                    </span>
                                </span>
                            </figcaption>
                        </figure>
                    ))}
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <div key={stat.label} className="surface-card p-6 text-center">
                            <dt className="sr-only">{stat.label}</dt>
                            <dd>
                                <span className="block text-3xl font-bold text-sage-900">
                                    {stat.value}
                                </span>
                                <span className="mt-1 block text-sm text-sage-800/75">
                                    {stat.label}
                                </span>
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    )
}
