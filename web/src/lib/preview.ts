// Turns an artifact (the agent's files) into one HTML page that runs it.
// Pure functions only: no React, no DOM. The page is shown in PreviewFrame's iframe.

import type { Artifact, ArtifactFile } from "./artifacts"
// "?raw" = Vite gives us the file's TEXT, so we can paste it into the page
import runtime from "./preview-runtime.js?raw"

// ---- (a) exact versions of what the preview page downloads ----
const REACT = "19.3.1"

export const CDN = {
    tailwind: "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.5",
    babel: "https://cdn.jsdelivr.net/npm/@babel/standalone@7.29.14/babel.min.js",
    // tells the browser where "react" etc. live when the code says `import ... from "react"`
    importMap: {
        imports: {
            react: `https://esm.sh/react@${REACT}`,
            "react/jsx-runtime": `https://esm.sh/react@${REACT}/jsx-runtime`,
            "react-dom": `https://esm.sh/react-dom@${REACT}?external=react`,
            "react-dom/client": `https://esm.sh/react-dom@${REACT}/client?external=react`,
        },
    },
}

const SOURCE = /\.(tsx|ts|jsx|js)$/
const COMPONENT = /\.(tsx|jsx)$/

// ---- (b) should the Preview button show? ----
export function isPreviewable(artifact: Artifact): boolean {
    return artifact.files.some((f) => COMPONENT.test(f.path))
}

// ---- (c) which file do we run first? ----
const fileName = (path: string) => path.split("/").pop() ?? path
const IMPORT_SPEC = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g
const RESOLVE_EXTS = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"]

// Same rules as `resolve` in preview-runtime.js (which can't be imported: it is inlined as text).
export function resolveImport(spec: string, from: string, paths: Set<string>): string | null {
    if (!(spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("@/"))) return null // npm package
    const joined = spec.startsWith("@/")
        ? "src/" + spec.slice(2)
        : spec.startsWith("/")
          ? spec.slice(1)
          : from.split("/").slice(0, -1).concat(spec).join("/")
    const parts: string[] = []
    for (const p of joined.split("/")) {
        if (p === "..") parts.pop()
        else if (p && p !== ".") parts.push(p)
    }
    const base = parts.join("/")
    return RESOLVE_EXTS.map((ext) => base + ext).find((p) => paths.has(p)) ?? null
}

export function pickEntry(files: ArtifactFile[]): string {
    const sources = files.filter((f) => SOURCE.test(f.path))

    // 1. an App.tsx always wins
    const app = sources.find((f) => /^App\.(tsx|jsx)$/.test(fileName(f.path)))
    if (app) return app.path

    // 2. a file with `export default` that no other file imports (the "top" component)
    const paths = new Set(files.map((f) => f.path))
    const imported = new Set<string>()
    for (const f of sources) {
        for (const [, spec] of f.code.matchAll(IMPORT_SPEC)) {
            const target = resolveImport(spec, f.path, paths)
            if (target && target !== f.path) imported.add(target)
        }
    }
    const top = sources.find((f) => /export\s+default/.test(f.code) && !imported.has(f.path))
    if (top) return top.path

    // 3. fall back to the first source file
    return sources[0]?.path ?? ""
}

// ---- (d) build the full HTML page as a string ----
export function buildPreviewDoc(artifact: Artifact): string {
    const files = artifact.files.filter((f) => SOURCE.test(f.path) || f.path.endsWith(".css"))
    // "<" → "\u003c" so a "</script>" inside the agent's code can't break our page
    const payload = JSON.stringify({ files, entry: pickEntry(files) }).replace(/</g, "\\u003c")

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="${CDN.tailwind}"></script>
<script src="${CDN.babel}"></script>
<script type="importmap">${JSON.stringify(CDN.importMap)}</script>
</head>
<body>
<div id="root"></div>
<script type="application/json" id="oa-files">${payload}</script>
<script type="module">${runtime}</script>
</body>
</html>`
}