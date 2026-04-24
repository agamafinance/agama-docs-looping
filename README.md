# Agama Protocol — Documentation

Documentation for the [Agama Protocol](https://agama.fi), a decentralized lending and borrowing protocol for Brazilian Real World Assets (RWA) on Rayls.

## Stack

Custom Next.js 15 + Tailwind CSS documentation site. Inspired by [rava.money/docs](https://www.rava.money/docs/overview).

- **Next.js 15** (App Router, React 19, RSC)
- **Tailwind CSS 3** with custom dark palette (brand green `#26E994`)
- **next-mdx-remote** (RSC) for Markdown rendering
- **rehype-pretty-code** + **shiki** for syntax highlighting
- **Host Grotesk** (text) + **JetBrains Mono** (code) via `next/font`
- **lucide-react** icons

## Local development

```bash
pnpm install
pnpm dev
```

Visit http://localhost:3003

### Build static site

```bash
pnpm build
pnpm start
```

Output: `.next/` (standard Next.js).

## Structure

```
app/
├── layout.tsx                  # Root layout (fonts, dark theme)
├── globals.css                 # Tailwind + custom CSS
└── docs/
    ├── layout.tsx              # TopNav + Sidebar shell
    ├── not-found.tsx           # 404
    └── [[...slug]]/page.tsx    # MDX renderer (all doc pages)

components/
├── TopNav.tsx                  # Header
├── Sidebar.tsx                 # Left nav
├── TableOfContents.tsx         # Right "On this page"
├── Breadcrumbs.tsx
├── PrevNext.tsx
└── mdx/
    ├── Callout.tsx
    └── mdx-components.tsx

lib/
├── navigation.ts               # Sidebar nav tree
└── content.ts                  # MD loader + admonition converter + link fixer

content/                        # Source markdown (Git-friendly, portable)
├── index.md
├── overview/
├── core/
│   ├── lending-pool/
│   ├── stability-pool/
│   ├── settlement-vault/
│   ├── adapters/
│   ├── tokens/
│   ├── compliance/
│   ├── collectors/
│   ├── governance.md
│   └── appendix/
├── parameters.md
├── challenges.md
├── security/
└── integrate/
```

## Content authoring

Content is plain Markdown in `content/`. Supported:

- Standard GFM (tables, task lists, strikethrough) via `remark-gfm`.
- MkDocs-style admonitions (`!!! note`, `!!! warning`, `!!! danger`, etc.) — auto-converted to `<Callout>` components.
- Heading anchors via `{ #custom-id }` syntax (MkDocs-compatible).
- Internal links with `.md` extension — auto-rewritten to clean URLs.
- Fenced code blocks with `shiki` highlighting.

## License

TBD.
