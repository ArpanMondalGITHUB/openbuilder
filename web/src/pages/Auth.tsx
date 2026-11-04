import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Sparkles } from "lucide-react"
import authPortal from "../assets/optimized/auth-portal.webp"
import openaiLogo from "../assets/openai.png"
import anthropicLogo from "../assets/anthropic.png"
import geminiLogo from "../assets/gemini-color.png"
import { checkCurrentUser, clearError, login, signup } from "../store/slice/authSlice"
import type { AppDispatch, RootState } from "../store/store"
import { signInSchema, signUpSchema } from "../models/auth.zod_models"

type Mode = "signin" | "signup"
type FieldErrors = Partial<Record<"name" | "email" | "password", string>>

const logos = [
    { src: openaiLogo, name: "OpenAI" },
    { src: anthropicLogo, name: "Anthropic" },
    { src: geminiLogo, name: "Gemini" },
]

export default function Auth() {
    const navigate = useNavigate()
    const dispatch = useDispatch<AppDispatch>()

    const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated)
    const authChecked = useSelector((s: RootState) => s.auth.authChecked)
    const isLoading = useSelector((s: RootState) => s.auth.isLoading)
    const formError = useSelector((s: RootState) => s.auth.error)

    const [mode, setMode] = useState<Mode>("signin")
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [errors, setErrors] = useState<FieldErrors>({})

    // isLoading is also true while we check the session on load — only treat it
    // as "busy" once that first check is done
    const busy = isLoading && authChecked

    useEffect(() => {
        dispatch(checkCurrentUser())
    }, [dispatch])

    useEffect(() => {
        if (authChecked && isAuthenticated) navigate("/home", { replace: true })
    }, [authChecked, isAuthenticated, navigate])

    const switchMode = (next: Mode) => {
        setMode(next)
        setErrors({})
        dispatch(clearError())
        setName("") // the name field only belongs to signup
    }

    const setFieldErrors = (issues: { path: PropertyKey[]; message: string }[]) => {
        const next: FieldErrors = {}
        for (const issue of issues) {
            const field = issue.path[0] as keyof FieldErrors
            if (field && !next[field]) next[field] = issue.message
        }
        setErrors(next)
    }

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setErrors({})
        dispatch(clearError())

        try {
            if (mode === "signup") {
                const parsed = signUpSchema.safeParse({ name, email, password })
                if (!parsed.success) {
                    setFieldErrors(parsed.error.issues)
                    return
                }
                await dispatch(signup(parsed.data)).unwrap()
            } else {
                const parsed = signInSchema.safeParse({ email, password })
                if (!parsed.success) {
                    setFieldErrors(parsed.error.issues)
                    return
                }
                await dispatch(login(parsed.data)).unwrap()
            }
            navigate("/home")
        } catch (err) {
            // the slice already stores the message; nothing to do here
            void err
        }
    }

    const inputClass =
        "w-full rounded-xl border border-sage-900/12 bg-white px-4 py-3 text-base text-sage-900 placeholder:text-sage-800/40 transition-colors focus:border-sage-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600 aria-invalid:border-destructive aria-invalid:outline-destructive"

    return (
        <div className="min-h-screen bg-sage-50">
            <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                <Link
                    to="/"
                    className="text-lg font-bold tracking-tight text-sage-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sage-700"
                >
                    openbuilder
                </Link>
                <Link
                    to="/"
                    className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-sage-800 transition-colors hover:text-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-700"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back home
                </Link>
            </header>

            <main className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-2 lg:gap-16 lg:py-16">
                {/* form */}
                <div className="w-full max-w-md justify-self-center lg:justify-self-start">
                    <h1 className="text-balance text-3xl font-bold text-sage-900 sm:text-4xl">
                        {mode === "signin" ? "Welcome back." : "Create your account."}
                    </h1>
                    <p className="mt-3 text-sage-800/80">
                        {mode === "signin"
                            ? "Sign in to pick up your threads where you left them."
                            : "One router, six agents, one continuous thread. Free to start."}
                    </p>

                    {/* mode toggle */}
                    <div
                        role="tablist"
                        aria-label="Sign in or create an account"
                        className="mt-8 grid grid-cols-2 gap-1 rounded-full border border-sage-900/10 bg-sage-100 p-1"
                    >
                        {(["signin", "signup"] as const).map((value) => (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={mode === value}
                                onClick={() => switchMode(value)}
                                className={`min-h-11 rounded-full text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600 ${
                                    mode === value
                                        ? "bg-white text-sage-900 shadow-sm"
                                        : "text-sage-800/80 hover:text-sage-900"
                                }`}
                            >
                                {value === "signin" ? "Sign in" : "Sign up"}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
                        {/* name — only on signup, slides in and out */}
                        <div
                            className={`grid transition-[grid-template-rows] duration-300 ${
                                mode === "signup" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                            }`}
                        >
                            <div className="overflow-hidden">
                                <div className="pb-5">
                                    <label
                                        htmlFor="name"
                                        className="mb-2 block text-sm font-medium text-sage-900"
                                    >
                                        Name
                                    </label>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        autoComplete="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        aria-invalid={!!errors.name}
                                        aria-describedby={errors.name ? "name-error" : undefined}
                                        tabIndex={mode === "signup" ? 0 : -1}
                                        className={inputClass}
                                        placeholder="Ada Lovelace"
                                    />
                                    {errors.name && (
                                        <p id="name-error" role="alert" className="mt-2 text-sm text-destructive">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="email"
                                className="mb-2 block text-sm font-medium text-sage-900"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? "email-error" : undefined}
                                className={inputClass}
                                placeholder="you@example.com"
                            />
                            {errors.email && (
                                <p id="email-error" role="alert" className="mt-2 text-sm text-destructive">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-medium text-sage-900"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete={
                                        mode === "signin" ? "current-password" : "new-password"
                                    }
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    aria-invalid={!!errors.password}
                                    aria-describedby={errors.password ? "password-error" : undefined}
                                    className={`${inputClass} pr-12`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-sage-700 transition-colors hover:text-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600"
                                >
                                    {showPassword ? (
                                        <EyeOff className="size-4" aria-hidden="true" />
                                    ) : (
                                        <Eye className="size-4" aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p id="password-error" role="alert" className="mt-2 text-sm text-destructive">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {formError && (
                            <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                                {formError}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={busy}
                            className="btn-lime w-full disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {busy ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                    {mode === "signin" ? "Signing in…" : "Creating account…"}
                                </>
                            ) : (
                                <>
                                    {mode === "signin" ? "Sign in" : "Create account"}
                                    <ArrowRight className="size-4" aria-hidden="true" />
                                </>
                            )}
                        </button>

                        <p className="text-center text-sm text-sage-800/80">
                            {mode === "signin" ? (
                                <>
                                    New here?{" "}
                                    <button
                                        type="button"
                                        onClick={() => switchMode("signup")}
                                        className="rounded-md font-semibold text-sage-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sage-600"
                                    >
                                        Create an account
                                    </button>
                                </>
                            ) : (
                                <>
                                    Already have an account?{" "}
                                    <button
                                        type="button"
                                        onClick={() => switchMode("signin")}
                                        className="rounded-md font-semibold text-sage-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sage-600"
                                    >
                                        Sign in
                                    </button>
                                </>
                            )}
                        </p>
                    </form>
                </div>

                {/* the portal */}
                <div className="relative hidden overflow-hidden rounded-4xl lg:block">
                    <img
                        src={authPortal}
                        alt="A glowing doorway standing in a field at dusk"
                        className="h-full w-full object-cover"
                        fetchPriority="high"
                        decoding="async"
                    />
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-[linear-gradient(to_top,oklch(0.19_0.03_140/0.85)_0%,oklch(0.19_0.03_140/0.35)_45%,transparent_75%)]"
                    />

                    <div className="absolute inset-x-0 bottom-0 p-9">
                        <p className="text-balance text-2xl font-bold text-sage-50">
                            One thread. Every agent. One workspace.
                        </p>
                        <p className="mt-2 max-w-sm text-sm text-sage-100/85">
                            Chat, search, code, documents, decks and images — routed
                            automatically, remembered for you.
                        </p>

                        <ul className="mt-6 flex items-center gap-3">
                            {logos.map(({ src, name: logoName }) => (
                                <li key={logoName}>
                                    <span className="inline-flex size-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 p-2 backdrop-blur">
                                        <img
                                            src={src}
                                            alt={`${logoName} logo`}
                                            className="h-full w-full object-contain"
                                        />
                                    </span>
                                </li>
                            ))}
                            <li className="ml-1 inline-flex items-center gap-1.5 text-xs text-sage-100/80">
                                <Sparkles className="size-3.5" aria-hidden="true" />
                                and more
                            </li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    )
}
