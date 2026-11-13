/// <reference types="node" />
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// Runs the real iframe runtime in Node with a stubbed DOM. "react" resolves from node_modules,
// so the test needs no network. The root reports children, so nothing is mounted.
const runtimeSource = readFileSync(new URL("./preview-runtime.js", import.meta.url), "utf8")
const Babel = createRequire(import.meta.url)("@babel/standalone")
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor

type VirtualFile = { path: string; code: string }

async function runRuntime(files: VirtualFile[], entry: string) {
    const messages: { type: string; message: string }[] = []
    const payload = JSON.stringify({ files: files.map((f) => ({ ...f, language: "tsx" })), entry })
    const document = {
        head: { append: () => {} },
        createElement: () => ({}),
        getElementById: (id: string) =>
            id === "oa-files" ? { textContent: payload } : { hasChildNodes: () => true },
    }
    const parent = { postMessage: (m: { type: string; message: string }) => messages.push(m) }
    const run = new AsyncFunction("Babel", "document", "parent", "addEventListener", "window", runtimeSource)
    await run(Babel, document, parent, () => {}, {})
    return messages
}

describe("preview runtime", () => {
    it("lazy-loads a local virtual file through the module loader", async () => {
        const g = globalThis as { __lazyPage?: Promise<{ default: () => string }> }
        const messages = await runRuntime(
            [
                {
                    path: "src/App.tsx",
                    code: 'globalThis.__lazyPage = import("./pages/Lazy")\nexport default function App() { return null }',
                },
                { path: "src/pages/Lazy.tsx", code: 'export default function Lazy(): string { return "lazy ok" }' },
            ],
            "src/App.tsx"
        )

        expect(messages).toEqual([expect.objectContaining({ type: "ready" })])
        expect((await g.__lazyPage!).default()).toBe("lazy ok")
    })

    it("preloads packages that are only imported dynamically", async () => {
        // the package can't actually load in Node; reaching the preload step is what's under test
        const messages = await runRuntime(
            [{ path: "src/App.tsx", code: 'const p = () => import("virtual-pkg")\nexport default () => null' }],
            "src/App.tsx"
        )
        expect(messages).toEqual([expect.objectContaining({ type: "error", message: 'Could not load package "virtual-pkg".' })])
    })

    it("rejects the lazy import (not the whole preview) when the file is missing", async () => {
        const g = globalThis as { __missing?: Promise<unknown> }
        const messages = await runRuntime(
            [{ path: "src/App.tsx", code: 'globalThis.__missing = import("./Nope")\nexport default () => null' }],
            "src/App.tsx"
        )
        expect(messages).toEqual([expect.objectContaining({ type: "ready" })])
        await expect(g.__missing).rejects.toThrow("Cannot find module './Nope' from src/App.tsx")
    })
})
