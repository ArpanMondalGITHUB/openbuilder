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
const baseName = (path: string) => fileName(path).replace(/\.\w+$/, "")
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export function pickEntry(files: ArtifactFile[]): string {
    const sources = files.filter((f) => SOURCE.test(f.path))

    // 1. an App.tsx always wins
    const app = sources.find((f) => /^App\.(tsx|jsx)$/.test(fileName(f.path)))
    if (app) return app.path

    // 2. a file with `export default` that no other file imports (the "top" component)
    const isImported = (file: ArtifactFile) => {
        const pattern = new RegExp(`from\\s+["'][^"']*/${escapeRegex(baseName(file.path))}(\\.\\w+)?["']`)
        return sources.some((other) => other !== file && pattern.test(other.code))
    }
    const top = sources.find((f) => /export\s+default/.test(f.code) && !isImported(f))
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