import orbBtc from "../../assets/optimized/orb-btc.webp"
import orbBnb from "../../assets/optimized/orb-bnb.webp"
import orbAvax from "../../assets/optimized/orb-avax.webp"

// floating 3D orbs, like the reference
const orbs = [
    { src: orbBtc, className: "left-[2%] top-[16%]", size: "size-14" },
    { src: orbAvax, className: "left-[13%] top-[44%]", size: "size-12" },
    { src: orbBnb, className: "left-[5%] bottom-[14%]", size: "size-16" },
    { src: orbBtc, className: "right-[4%] top-[14%]", size: "size-12" },
    { src: orbAvax, className: "right-[14%] top-[42%]", size: "size-16" },
    { src: orbBnb, className: "right-[2%] bottom-[16%]", size: "size-12" },
]

const checks = ["Fast", "Optimised work", "Reliable"]

export function Showcase() {
    return (
        <section className="relative overflow-hidden bg-sage-50 py-24 sm:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="eyebrow">Access</span>
                    <h2 className="mt-5 text-balance text-3xl font-bold text-sage-900 sm:text-5xl">
                        Access top-tier models instantly
                    </h2>
                </div>

                {/* the green capsule */}
                <div className="mx-auto mt-9 flex w-fit items-center gap-4 rounded-full bg-[linear-gradient(120deg,var(--color-sage-600),var(--color-sage-400),var(--color-lime-accent))] px-6 py-3 shadow-lg shadow-sage-900/10">
                    {checks.map((check) => (
                        <span
                            key={check}
                            className="flex items-center gap-1.5 text-xs font-medium text-sage-50 sm:text-sm"
                        >
                            <span
                                aria-hidden="true"
                                className="inline-flex size-4 items-center justify-center rounded-full bg-white/90 text-sage-700"
                            >
                                <svg viewBox="0 0 12 12" className="size-2.5 fill-current">
                                    <path d="M10.5 3.5 5 9 1.5 5.5 2.8 4.2 5 6.4 9.2 2.2z" />
                                </svg>
                            </span>
                            {check}
                        </span>
                    ))}
                </div>

                <p className="mx-auto mt-7 max-w-xl text-center text-base leading-relaxed text-sage-800/80">
                    openbuilder brings every model provider into one clean interface — so
                    you can choose the right model for any task, switch between them
                    instantly, and always get the best answer.
                </p>

                <div className="relative mt-16">
                    {/* floating orbs */}
                    {orbs.map(({ src, className, size }, i) => (
                        <span
                            key={`${src}-${i}`}
                            aria-hidden="true"
                            className={`animate-float-slow absolute hidden items-center justify-center rounded-full bg-white/70 p-1.5 shadow-[0_14px_36px_-16px_oklch(0.235_0.042_140/0.5)] backdrop-blur md:flex ${size} ${className}`}
                            style={{ animationDelay: `${i * 0.7}s` }}
                        >
                            <img src={src} alt="" className="h-full w-full object-contain" />
                        </span>
                    ))}

                    <div className="surface-card relative mx-auto max-w-2xl overflow-hidden p-8 sm:p-12">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 -bottom-24 h-56 bg-[radial-gradient(60%_100%_at_50%_100%,var(--color-sage-300),transparent_72%)] blur-xl"
                        />

                        <div className="relative">
                            <span className="eyebrow">Live session</span>
                            <h3 className="mt-5 text-balance text-2xl font-bold text-sage-900 sm:text-3xl">
                                One prompt, routed to the right agent
                            </h3>

                            <div className="mt-7 space-y-3">
                                <div className="flex justify-end">
                                    <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-sage-900 px-4 py-3 text-sm leading-relaxed text-sage-50">
                                        Write a Python script that renames files by date
                                        and prints a summary.
                                    </p>
                                </div>
                                <div className="flex justify-start">
                                    <p className="max-w-[85%] rounded-2xl rounded-bl-sm border border-sage-900/8 bg-white px-4 py-3 text-sm leading-relaxed text-sage-800">
                                        <span className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-sage-600 uppercase">
                                            routed to · coding agent
                                        </span>
                                        <br />
                                        Here is the script — it walks the directory, parses
                                        each timestamp and renames in a single pass.
                                    </p>
                                </div>
                            </div>

                            <p className="mt-7 text-xs text-sage-700/70">
                                One router, six agents, zero tab switching.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
