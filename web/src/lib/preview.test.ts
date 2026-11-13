import { describe, expect, it } from "vitest"
import { buildPreviewDoc, CDN, isPreviewable, pickEntry } from "./preview"
import type { Artifact, ArtifactFile } from "./artifacts"

const file = (path: string, code = ""): ArtifactFile => ({ path, language: "tsx", code })
const artifact = (...files: ArtifactFile[]): Artifact => ({ id: "m1", title: "t", files })

describe("isPreviewable", () => {
    it("is true when there is a .tsx or .jsx file", () => {
        expect(isPreviewable(artifact(file("src/Card.tsx")))).toBe(true)
        expect(isPreviewable(artifact(file("src/Card.jsx")))).toBe(true)
    })
    it("is false for non-component files", () => {
        expect(isPreviewable(artifact(file("src/api.ts"), file("schema.sql"), file("run.sh")))).toBe(false)
    })
})

describe("pickEntry", () => {
    it("prefers App.tsx", () => {
        const files = [file("src/components/Card.tsx", "export default function Card() {}"), file("src/App.tsx")]
        expect(pickEntry(files)).toBe("src/App.tsx")
    })
    it("picks the default-export file nobody imports", () => {
        const files = [
            file("src/components/Avatar.tsx", "export default function Avatar() {}"),
            file("src/components/ProfileCard.tsx", 'import Avatar from "./Avatar"\nexport default function ProfileCard() {}'),
        ]
        expect(pickEntry(files)).toBe("src/components/ProfileCard.tsx")
    })
    it("treats a directory import as importing its index.tsx", () => {
        const files = [
            file("src/components/Card/index.tsx", "export default function Card() {}"),
            file("src/Page.tsx", 'import Card from "./components/Card"\nexport default function Page() {}'),
        ]
        expect(pickEntry(files)).toBe("src/Page.tsx")
    })
    it("resolves @/ aliases and lazy import() the same way as the runtime", () => {
        const files = [
            file("src/components/Modal/index.tsx", "export default function Modal() {}"),
            file("src/pages/Settings.tsx", "export default function Settings() {}"),
            file(
                "src/Shell.tsx",
                'import Modal from "@/components/Modal"\nconst S = lazy(() => import("./pages/Settings"))\nexport default function Shell() {}'
            ),
        ]
        expect(pickEntry(files)).toBe("src/Shell.tsx")
    })
    it("ignores css files", () => {
        expect(pickEntry([file("src/styles/card.css"), file("src/Card.tsx")])).toBe("src/Card.tsx")
    })
    it("returns empty string when there is no source file", () => {
        expect(pickEntry([file("a.css")])).toBe("")
    })
})

describe("buildPreviewDoc", () => {
    const doc = buildPreviewDoc(artifact(file("src/Card.tsx", 'export default () => <script>{"</script>"}</script>')))

    it("loads the pinned CDN scripts and import map", () => {
        expect(doc).toContain(CDN.tailwind)
        expect(doc).toContain(CDN.babel)
        expect(doc).toContain('<script type="importmap">')
        expect(doc).toContain(CDN.importMap.imports.react)
    })
    it("escapes </script> in user code so the page can't be broken", () => {
        const payload = doc.split('id="oa-files">')[1].split("</script>")[0]
        expect(payload).not.toContain("<")
        expect(JSON.parse(payload).files[0].code).toContain("</script>")
        expect(JSON.parse(payload).entry).toBe("src/Card.tsx")
    })
    it("drops non-source files from the payload", () => {
        const d = buildPreviewDoc(artifact(file("src/Card.tsx"), file("README.md"), file("src/card.css")))
        const payload = JSON.parse(d.split('id="oa-files">')[1].split("</script>")[0])
        expect(payload.files.map((f: ArtifactFile) => f.path)).toEqual(["src/Card.tsx", "src/card.css"])
    })
})
