// Runs INSIDE the preview iframe (inlined by buildPreviewDoc via "?raw").
// Compiles the agent's TSX with Babel, loads npm packages from esm.sh, then renders
// the entry file's default export into #root. Reports "ready" / "error" to the app.
/* global Babel */

const send = (type, message) =>
    parent.postMessage({ source: "oa-preview", type, message: String(message ?? "") }, "*")

addEventListener("error", (e) => send("error", e.message))
addEventListener("unhandledrejection", (e) => send("error", e.reason?.message ?? e.reason))

// The sandboxed frame has an opaque origin, so the real storage throws. Give the code an in-memory one.
const memoryStorage = () => {
    const m = new Map()
    return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => void m.set(k, String(v)),
        removeItem: (k) => void m.delete(k),
        clear: () => m.clear(),
        key: (i) => [...m.keys()][i] ?? null,
        get length() {
            return m.size
        },
    }
}
for (const name of ["localStorage", "sessionStorage"]) {
    try {
        void window[name]
    } catch {
        Object.defineProperty(window, name, { value: memoryStorage(), configurable: true })
    }
}

try {
    const { files, entry } = JSON.parse(document.getElementById("oa-files").textContent)
    if (!entry) throw new Error("No component file to preview.")
    const byPath = Object.fromEntries(files.map((f) => [f.path, f]))

    // 0. every CSS file is part of the app, even one only main.tsx imports (main.tsx never runs
    //    when App.tsx is the entry). The Tailwind browser build already provides the base layer.
    for (const f of files) {
        if (!f.path.endsWith(".css")) continue
        const style = document.createElement("style")
        style.type = "text/tailwindcss" // keeps @apply / @theme working
        style.textContent = f.code.replace(/@import\s+["']tailwindcss["'][^;]*;?|@tailwind\s+[\w-]+;?/g, "")
        document.head.append(style)
    }

    // 1. TS/TSX/JSX → plain JS with require()/module.exports
    //    (the typescript preset picks JSX parsing from the file extension: <T>x stays valid in .ts)
    const compiled = {}
    for (const f of files) {
        if (f.path.endsWith(".css")) continue
        compiled[f.path] = Babel.transform(f.code, {
            filename: f.path,
            presets: ["typescript", ["react", { runtime: "automatic" }]],
            plugins: ["transform-modules-commonjs"],
        }).code
    }

    // 2. npm imports ("react", "lucide-react", …) are downloaded up front so require() can stay sync
    const isLocal = (s) => s.startsWith(".") || s.startsWith("/") || s.startsWith("@/")
    const bare = new Set()
    for (const code of Object.values(compiled)) {
        for (const m of code.matchAll(/require\("([^"]+)"\)/g)) if (!isLocal(m[1])) bare.add(m[1])
    }
    const pkgs = {}
    await Promise.all(
        [...bare].map(async (spec) => {
            // react* come from the import map; everything else shares that same React via ?external
            const url = /^react(-dom)?(\/|$)/.test(spec) ? spec : `https://esm.sh/${spec}?external=react,react-dom`
            let ns
            try {
                ns = await import(url)
            } catch {
                throw new Error(`Could not load package "${spec}".`)
            }
            pkgs[spec] = { __esModule: true, ...ns }
        })
    )

    // 3. a tiny module system over the agent's own files
    const resolve = (spec, from) => {
        const joined = spec.startsWith("@/")
            ? "src/" + spec.slice(2)
            : spec.startsWith("/")
              ? spec.slice(1)
              : from.split("/").slice(0, -1).concat(spec).join("/")
        const parts = []
        for (const p of joined.split("/")) {
            if (p === "..") parts.pop()
            else if (p && p !== ".") parts.push(p)
        }
        const base = parts.join("/")
        for (const ext of ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"]) {
            if (byPath[base + ext]) return base + ext
        }
        throw new Error(`Cannot find module '${spec}' from ${from}`)
    }

    const cache = {}
    const load = (path) => {
        if (cache[path]) return cache[path].exports
        const module = (cache[path] = { exports: {} })
        const run = new Function("require", "module", "exports", `${compiled[path]}\n//# sourceURL=${path}`)
        run((spec) => requireFrom(spec, path), module, module.exports)
        return module.exports
    }

    const requireFrom = (spec, from) => {
        if (pkgs[spec]) return pkgs[spec]
        const path = resolve(spec, from)
        return path.endsWith(".css") ? {} : load(path) // CSS was injected in step 0
    }

    // 4. run the entry and mount its default export (unless it rendered into #root itself)
    const App = load(entry).default
    const root = document.getElementById("root")
    if (typeof App === "function" || (App && typeof App === "object")) {
        if (!root.hasChildNodes()) {
            const { createElement } = await import("react")
            const { createRoot } = await import("react-dom/client")
            createRoot(root, { onUncaughtError: (err) => send("error", err?.message ?? err) }).render(createElement(App))
        }
    } else if (!/createRoot|\.render\(/.test(byPath[entry].code)) {
        // (a self-rendering main.tsx renders asynchronously, so #root can still be empty here)
        throw new Error(`${entry} has no default export to render.`)
    }
    send("ready")
} catch (err) {
    send("error", err?.message ?? err)
}
