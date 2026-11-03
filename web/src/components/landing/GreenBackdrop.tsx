type GreenBackdropProps = {
    className?: string
}

/**
 * The rolling-hill gradient artwork from the reference design, built entirely
 * from blurred radial gradients so there are no image assets to ship.
 */
export function GreenBackdrop({ className = "" }: GreenBackdropProps) {
    return (
        <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
        >
            {/* sky wash */}
            <div className="absolute inset-x-0 top-0 h-[70%] bg-[radial-gradient(65%_55%_at_50%_0%,var(--color-sage-100),transparent_72%)]" />

            {/* distant ridge, left */}
            <div className="animate-float-slow absolute -bottom-[12%] -left-[18%] h-[58%] w-[78%] rounded-[50%] bg-[radial-gradient(closest-side,var(--color-sage-300),transparent_72%)] blur-2xl" />

            {/* distant ridge, right */}
            <div className="animate-float absolute -bottom-[16%] -right-[16%] h-[62%] w-[80%] rounded-[50%] bg-[radial-gradient(closest-side,var(--color-sage-400),transparent_70%)] blur-2xl" />

            {/* mid ground */}
            <div className="absolute -bottom-[28%] left-[18%] h-[54%] w-[72%] rounded-[50%] bg-[radial-gradient(closest-side,var(--color-sage-500),transparent_70%)] blur-xl" />

            {/* foreground hill */}
            <div className="absolute -bottom-[48%] left-1/2 h-[82%] w-[150%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(58%_100%_at_50%_0%,var(--color-sage-700),var(--color-sage-900)_62%,transparent_72%)] blur-2xl" />
        </div>
    )
}
