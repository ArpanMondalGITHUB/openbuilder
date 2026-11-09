import { useCallback, useEffect, useState } from "react"
import filesApi, { type Disposition } from "../api/files.api"
import { isExpired, type GeneratedFile } from "../lib/generatedFiles"

// Fresh links are shared by every card showing the same file, and reused until they expire.
const cache = new Map<string, { url: string; expiresAt: number }>()
const FRESH_TTL_MS = 14 * 60_000 // the backend signs these for 15 minutes

const cacheKey = (key: string, disposition?: Disposition) => `${key}|${disposition ?? ""}`

export async function freshUrl(file: GeneratedFile, disposition?: Disposition): Promise<string> {
    // the link in the reply is fine as-is for the stored disposition while it lasts
    if (!disposition && !isExpired(file)) return file.url
    const k = cacheKey(file.key, disposition)
    const hit = cache.get(k)
    if (hit && hit.expiresAt > Date.now()) return hit.url
    const url = await filesApi.getUrl(file.key, { disposition, name: file.name })
    cache.set(k, { url, expiresAt: Date.now() + FRESH_TTL_MS })
    return url
}

// Downloads without leaving the page: the link carries Content-Disposition: attachment.
export async function downloadFile(file: GeneratedFile) {
    const url = await freshUrl(file, file.kind === "image" ? "attachment" : undefined)
    const a = document.createElement("a")
    a.href = url
    a.rel = "noopener"
    a.click()
}

// Opens the file in a new tab (PDFs render in the browser's viewer). The tab is
// opened before the await so popup blockers still treat it as a click.
export async function openInNewTab(file: GeneratedFile) {
    const tab = window.open("about:blank", "_blank")
    try {
        const url = await freshUrl(file, file.kind === "pdf" ? "inline" : undefined)
        if (tab) {
            tab.opener = null
            tab.location.href = url
        } else {
            window.open(url, "_blank", "noopener")
        }
    } catch (error) {
        tab?.close()
        throw error
    }
}

// URL to display (for <img>): the reply's link, or a fresh one once it has expired.
// `retry` is for onError — a link can be revoked or expire while the page is open.
export function useDisplayUrl(file: GeneratedFile) {
    const { key, url: replyUrl } = file
    const expired = isExpired(file)
    const [state, setState] = useState<{ url: string | null; error: boolean }>(() => ({
        url: expired ? null : replyUrl,
        error: false,
    }))
    // 0 = use the reply's link, 1 = fetched a fresh one, 2 = gave up
    const [attempt, setAttempt] = useState(expired ? 1 : 0)
    const [nonce, setNonce] = useState(0) // bumped by reload() to refetch

    useEffect(() => {
        if (attempt !== 1) return
        let cancelled = false
        // keyed on the file key, not the object: replies are re-parsed on every poll
        freshUrl({ ...file, expiresAt: 0 }) // force a fresh link
            .then((url) => !cancelled && setState({ url, error: false }))
            .catch(() => !cancelled && setState({ url: null, error: true }))
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, attempt, nonce])

    // <img onError>: the reply's link may have expired or been revoked — try one
    // fresh link (dropping any cached one), then show the error state
    const retry = useCallback(() => {
        if (attempt === 0) {
            cache.delete(cacheKey(key))
            setState({ url: null, error: false })
            setAttempt(1)
        } else {
            setState({ url: null, error: true })
            setAttempt(2)
        }
    }, [attempt, key])

    // "Try again" from the error state
    const reload = useCallback(() => {
        cache.delete(cacheKey(key))
        setState({ url: null, error: false })
        setAttempt(1)
        setNonce((n) => n + 1)
    }, [key])

    return { ...state, retry, reload }
}
