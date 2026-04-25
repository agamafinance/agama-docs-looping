# Agama Protocol — Documentation

Documentation site for the [Agama Protocol](https://agama.fi).

Live: **https://docs.agama.finance**

## Stack

- Next.js 15 (App Router, React 19, RSC)
- Tailwind CSS 3, dark theme
- `next-mdx-remote` for Markdown rendering, `rehype-pretty-code` + `shiki` for syntax highlighting
- Host Grotesk (text) + JetBrains Mono (code) via `next/font`

## Local

```bash
pnpm install
pnpm dev      # http://localhost:3003
```

## Build

```bash
pnpm build
pnpm start
```

Output: `.next/`. Production deploys to Vercel.

## Layout

```
app/         Next.js App Router (root layout + docs route)
components/  Sidebar, search dialog, MDX components, icons
lib/         Markdown loader + sidebar nav tree + search index
content/     Source markdown (one file per page)
```

## Content authoring

Plain Markdown in `content/`. Supported:

- GFM tables, task lists, strikethrough
- MkDocs-style admonitions (`!!! note`, `!!! warning`, …) — inlined as plain content
- Heading anchors via `{ #custom-id }`
- Internal links ending in `.md` — auto-rewritten to clean URLs
- Fenced code blocks with `shiki` highlighting

## License

TBD.
