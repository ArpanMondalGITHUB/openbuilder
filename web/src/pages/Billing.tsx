import { useCallback, useEffect, useRef, useState } from "react"
import axios from "axios"
import { AlertCircle, Check, CheckCircle2, Loader2, Zap } from "lucide-react"
import billingApi, { type PaidPlanId, type Payment, type Plan } from "../api/billing.api"
import { useShell } from "../components/home/shell.context"
import { useAppDispatch, useAppSelector } from "../hooks/hooks"
import { formatPrice, usagePercent, waitForPlan } from "../lib/billing"
import { CheckoutDismissed, loadRazorpay, openCheckout } from "../lib/razorpay"
import { fetchSubscription, patchSubscription, setSubscription } from "../store/slice/billingSlice"

type Notice = { kind: "info" | "success" | "error"; text: string } | null

const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null

const errorText = (error: unknown) =>
    (axios.isAxiosError(error) && (error.response?.data as { message?: string } | undefined)?.message) ||
    (error instanceof Error ? error.message : "Something went wrong. Try again.")

const PAYMENT_STATUS_LABEL: Record<string, string> = { captured: "Paid", failed: "Failed", refunded: "Refunded" }

export default function Billing() {
    const { user } = useShell()
    const dispatch = useAppDispatch()
    // persisted in Redux (+ localStorage): the cached plan shows instantly, then the fetch below refreshes it
    const sub = useAppSelector((s) => s.billing.subscription)
    const [plans, setPlans] = useState<Plan[]>([])
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)
    const [busy, setBusy] = useState<PaidPlanId | "cancel" | null>(null)
    const [notice, setNotice] = useState<Notice>(null)
    const mounted = useRef(true)

    const load = useCallback(async () => {
        const [p, , pay] = await Promise.all([
            billingApi.getPlans(),
            dispatch(fetchSubscription()).unwrap(),
            billingApi.listPayments(),
        ])
        if (!mounted.current) return
        setPlans(p)
        setPayments(pay)
    }, [dispatch])

    useEffect(() => {
        mounted.current = true
        load()
            .catch(() => mounted.current && setLoadError(true))
            .finally(() => mounted.current && setLoading(false))
        return () => {
            mounted.current = false
        }
    }, [load])

    const currentPlan = plans.find((p) => p.id === sub?.plan)
    const onPaidPlan = !!sub && sub.plan !== "free"

    const upgrade = async (plan: Plan) => {
        if (plan.id === "free") return
        const planId = plan.id
        setBusy(planId)
        setNotice(null)
        try {
            const { subscriptionId, keyId } = await billingApi.createSubscription(planId)
            const Razorpay = await loadRazorpay()
            const response = await openCheckout(
                {
                    key: keyId,
                    subscription_id: subscriptionId,
                    name: "OpenBuilder",
                    description: `${plan.name} plan · monthly`,
                    prefill: { name: user?.name, email: user?.email },
                    theme: { color: "#c5d94e" },
                },
                Razorpay
            )
            // verify checks the signature and syncs the subscription straight from Razorpay
            const verified = await billingApi.verify(response)
            if (!mounted.current) return

            let updated = verified.plan === planId ? verified : null
            if (!updated) {
                // Razorpay can take a few seconds to move the subscription to active: keep re-syncing
                setNotice({ kind: "info", text: "Payment received. Activating your plan…" })
                updated = await waitForPlan(() => billingApi.verify(response), planId)
            }
            if (!mounted.current) return
            if (updated) {
                dispatch(setSubscription({ subscription: updated, ownerId: user?.id ?? null }))
                setNotice({ kind: "success", text: `You're on ${plan.name}. Enjoy!` })
                billingApi.listPayments().then((p) => mounted.current && setPayments(p)).catch(() => {})
            } else {
                setNotice({ kind: "info", text: "Payment received. Your plan will update in a minute; refresh this page." })
            }
        } catch (error) {
            if (!mounted.current || error instanceof CheckoutDismissed) return
            setNotice({ kind: "error", text: errorText(error) })
        } finally {
            if (mounted.current) setBusy(null)
        }
    }

    const cancel = async () => {
        if (!sub || !currentPlan) return
        const until = formatDate(sub.currentPeriodEnd)
        const ok = window.confirm(
            `Cancel ${currentPlan.name}? You'll keep it${until ? ` until ${until}` : " until the end of this billing period"}, then move to Free.`
        )
        if (!ok) return
        setBusy("cancel")
        setNotice(null)
        try {
            const res = await billingApi.cancel()
            if (!mounted.current) return
            dispatch(
                patchSubscription({
                    cancelAtPeriodEnd: res.cancelAtPeriodEnd,
                    ...(res.currentPeriodEnd ? { currentPeriodEnd: res.currentPeriodEnd } : {}),
                })
            )
            setNotice({ kind: "success", text: "Subscription cancelled. You won't be charged again." })
        } catch (error) {
            if (mounted.current) setNotice({ kind: "error", text: errorText(error) })
        } finally {
            if (mounted.current) setBusy(null)
        }
    }

    // with a cached plan we render right away and let the refresh land quietly
    if (loading && !sub) {
        return (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" aria-label="Loading billing" />
            </div>
        )
    }

    if (loadError || !sub) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <AlertCircle className="size-6 text-destructive" />
                <p>Couldn't load your billing details.</p>
                <button type="button" onClick={() => window.location.reload()} className="text-foreground underline underline-offset-4">
                    Try again
                </button>
            </div>
        )
    }

    const percent = usagePercent(sub.usage.used, sub.usage.limit)
    const periodEnd = formatDate(sub.currentPeriodEnd)

    return (
        <section className="flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pt-4 pb-16">
                <h1 className="text-2xl font-normal text-foreground">Plans &amp; billing</h1>

                {notice && (
                    <div
                        role={notice.kind === "error" ? "alert" : "status"}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
                            notice.kind === "error"
                                ? "border-destructive/40 text-destructive"
                                : notice.kind === "success"
                                  ? "border-lime-accent/40 text-foreground"
                                  : "border-border text-muted-foreground"
                        }`}
                    >
                        {notice.kind === "error" ? (
                            <AlertCircle className="size-4 shrink-0" />
                        ) : notice.kind === "success" ? (
                            <CheckCircle2 className="size-4 shrink-0 text-lime-accent" />
                        ) : (
                            <Loader2 className="size-4 shrink-0 animate-spin" />
                        )}
                        {notice.text}
                    </div>
                )}

                {/* current plan + usage */}
                <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Current plan</p>
                            <p className="mt-1 text-xl text-card-foreground">{currentPlan?.name ?? sub.plan}</p>
                            {onPaidPlan && periodEnd && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {sub.cancelAtPeriodEnd ? `Cancelled · ends on ${periodEnd}` : `Renews on ${periodEnd}`}
                                </p>
                            )}
                            {sub.status === "pending" && (
                                <p className="mt-1 text-sm text-destructive">
                                    Your last payment failed. Razorpay is retrying; update your payment method if it keeps failing.
                                </p>
                            )}
                        </div>
                        {onPaidPlan && !sub.cancelAtPeriodEnd && (
                            <button
                                type="button"
                                onClick={() => void cancel()}
                                disabled={busy !== null}
                                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                            >
                                {busy === "cancel" ? <Loader2 className="size-4 animate-spin" aria-label="Cancelling" /> : "Cancel plan"}
                            </button>
                        )}
                    </div>

                    <div className="mt-5">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Prompts this month</span>
                            <span className="text-card-foreground tabular-nums">
                                {sub.usage.used.toLocaleString()} / {sub.usage.limit.toLocaleString()}
                            </span>
                        </div>
                        <div
                            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-label="Prompts used this month"
                            aria-valuemin={0}
                            aria-valuemax={sub.usage.limit}
                            aria-valuenow={sub.usage.used}
                        >
                            <div
                                className={`h-full rounded-full transition-[width] ${percent >= 100 ? "bg-destructive" : "bg-lime-accent"}`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        {percent >= 100 && (
                            <p className="mt-2 text-sm text-muted-foreground">You've used all your prompts this month. Upgrade to keep going.</p>
                        )}
                    </div>
                </div>

                {/* plans */}
                <div>
                    <h2 className="mb-3 text-sm font-medium text-muted-foreground">Plans</h2>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {plans.map((plan) => {
                            const isCurrent = plan.id === sub.plan
                            return (
                                <div
                                    key={plan.id}
                                    className={`flex flex-col rounded-2xl border bg-card p-5 ${isCurrent ? "border-lime-accent/60" : "border-border"}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-card-foreground">{plan.name}</p>
                                        {isCurrent && (
                                            <span className="rounded-full bg-lime-accent/15 px-2 py-0.5 text-xs text-lime-accent">Current</span>
                                        )}
                                    </div>
                                    <p className="mt-3 text-2xl text-card-foreground">
                                        {formatPrice(plan.price)}
                                        {plan.price > 0 && <span className="text-sm text-muted-foreground"> / month</span>}
                                    </p>
                                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Check className="size-4 text-lime-accent" aria-hidden="true" />
                                        {plan.promptLimit.toLocaleString()} prompts / month
                                    </p>

                                    <div className="mt-5 flex-1" />
                                    {plan.id !== "free" && !isCurrent && (
                                        <button
                                            type="button"
                                            onClick={() => void upgrade(plan)}
                                            disabled={busy !== null || onPaidPlan}
                                            title={onPaidPlan ? "Cancel your current plan before switching" : undefined}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-lime-accent px-3 py-2 text-sm font-medium text-sage-900 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {busy === plan.id ? (
                                                <Loader2 className="size-4 animate-spin" aria-label="Opening checkout" />
                                            ) : (
                                                <>
                                                    <Zap className="size-4" aria-hidden="true" />
                                                    Upgrade to {plan.name}
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* payment history */}
                <div>
                    <h2 className="mb-3 text-sm font-medium text-muted-foreground">Payment history</h2>
                    {payments.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                            No payments yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                            <table className="w-full text-left text-sm">
                                <thead className="text-muted-foreground">
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-2.5 font-normal">Date</th>
                                        <th className="px-4 py-2.5 font-normal">Plan</th>
                                        <th className="px-4 py-2.5 font-normal">Amount</th>
                                        <th className="px-4 py-2.5 font-normal">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((p) => (
                                        <tr key={p.id} className="border-b border-border last:border-0">
                                            <td className="px-4 py-2.5 whitespace-nowrap text-foreground">{formatDate(p.created_at)}</td>
                                            <td className="px-4 py-2.5 text-foreground capitalize">{p.plan}</td>
                                            <td className="px-4 py-2.5 text-foreground tabular-nums">{formatPrice(p.amount)}</td>
                                            <td className={`px-4 py-2.5 ${p.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
                                                {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
