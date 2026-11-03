import { ArrowRight } from "lucide-react"
import ctaHills from "../../assets/optimized/cta-hills.webp"

export function FinalCta() {
    return (
        <section className="relative isolate overflow-hidden">
            <img
                src={ctaHills}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_70%]"
            />
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-sage-50)_0%,var(--color-sage-50)/25_25%,transparent_55%,var(--color-sage-50)_100%)]"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-sage-100/40 mix-blend-multiply" />

            <div className="relative mx-auto max-w-6xl px-6 py-28 text-center sm:py-36">
                <span className="eyebrow">Get started</span>
                <h2 className="mx-auto mt-6 max-w-2xl text-balance text-3xl font-bold text-sage-900 sm:text-5xl">
                    Start using every AI. In one place.
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-sage-800/85 sm:text-lg">
                    Sign in, ask a question, and let the router do the rest. Free to
                    start, nothing to install.
                </p>

                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <a href="#top" className="btn-lime w-full sm:w-auto">
                        Start building free
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </a>
                    <a href="#pricing" className="btn-pill-light w-full sm:w-auto">
                        Talk to sales
                    </a>
                </div>
            </div>
        </section>
    )
}
