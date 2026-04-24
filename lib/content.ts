import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

export interface DocPage {
  slug: string[];
  source: string;
  frontmatter: Record<string, any>;
  toc: TocEntry[];
}

export interface TocEntry {
  id: string;
  text: string;
  depth: number;
}

const CONTENT_DIR = path.join(process.cwd(), 'content');

/** Map a URL slug array to a concrete file path. */
function slugToFile(slug: string[]): string {
  const rel = slug.join('/') || 'index';
  return path.join(CONTENT_DIR, `${rel}.md`);
}

/** Convert a text heading to an URL-safe slug (GitHub-ish). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Strip MkDocs `{ #id }` heading attribute and return (cleanText, customId). */
function parseHeadingAttr(raw: string): { text: string; id?: string } {
  const m = raw.match(/^(.*?)\s*\{\s*#([a-zA-Z0-9_-]+)\s*\}\s*$/);
  if (m) return { text: m[1].trim(), id: m[2] };
  return { text: raw.trim() };
}

/** Extract TOC from markdown (H2/H3). */
export function extractToc(md: string): TocEntry[] {
  const toc: TocEntry[] = [];
  const inCode = { val: false };
  for (const line of md.split('\n')) {
    if (line.trim().startsWith('```')) {
      inCode.val = !inCode.val;
      continue;
    }
    if (inCode.val) continue;
    const m = line.match(/^(#{1,4})\s+(.*)$/);
    if (!m) continue;
    const depth = m[1].length;
    if (depth < 2 || depth > 3) continue;
    const { text, id } = parseHeadingAttr(m[2]);
    const finalId = id || slugify(text);
    toc.push({ id: finalId, text, depth });
  }
  return toc;
}

/** Strip MkDocs admonitions `!!! type` and inline their body as plain content. */
function convertAdmonitions(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^!!!\s+(\w+)(?:\s+"([^"]*)")?\s*$/);
    if (!m) {
      out.push(line);
      i++;
      continue;
    }
    i++;
    const body: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (l === '' || l.match(/^(    |\t)/)) {
        body.push(l.replace(/^(    |\t)/, ''));
        i++;
      } else {
        break;
      }
    }
    while (body.length && body[0].trim() === '') body.shift();
    while (body.length && body[body.length - 1].trim() === '') body.pop();
    out.push('');
    out.push(...body);
    out.push('');
  }
  return out.join('\n');
}

/** Fix internal markdown links: strip `.md`, normalize `../` to `/docs/...`. */
function fixLinks(md: string, slug: string[]): string {
  // Replace [text](foo.md)  →  [text](/docs/<resolved-path>)
  // Relative paths like "functions.md" resolve against current slug's directory.
  const slugDir = slug.slice(0, Math.max(slug.length - 1, 0)); // current page's directory
  const pageDir = slug.length === 0 ? [] : slugDir;

  return md.replace(
    /\]\((?!https?:\/\/|#|mailto:)([^)\s]+?)(#[^)\s]*)?\)/g,
    (_, target: string, anchor?: string) => {
      const a = anchor || '';
      let resolved: string;
      if (target.startsWith('/')) {
        resolved = target.replace(/\.md$/, '');
      } else {
        // relative
        const parts = [...pageDir];
        for (const seg of target.split('/')) {
          if (seg === '..') parts.pop();
          else if (seg === '.' || seg === '') continue;
          else parts.push(seg);
        }
        // strip trailing .md
        const last = parts[parts.length - 1] || '';
        parts[parts.length - 1] = last.replace(/\.md$/, '');
        resolved = '/docs/' + parts.join('/');
      }
      return `](${resolved}${a})`;
    },
  );
}

/** Convert heading attr `{ #id }` to explicit id on the markdown heading.
 *  We keep the attr syntax as MDX-compatible inline HTML comment + an `<a id>` anchor.
 *  Simpler: transform to `## Heading` with `<a id="..."></a>` BEFORE the heading.
 */
function rewriteHeadingIds(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inCode = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCode = !inCode;
      out.push(line);
      continue;
    }
    if (!inCode) {
      const m = line.match(/^(#{1,6})\s+(.+?)\s*\{\s*#([a-zA-Z0-9_-]+)\s*\}\s*$/);
      if (m) {
        const hashes = m[1];
        const text = m[2];
        const id = m[3];
        out.push(`<a id="${id}"></a>`);
        out.push(`${hashes} ${text}`);
        continue;
      }
    }
    out.push(line);
  }
  return out.join('\n');
}

export async function loadDoc(slug: string[]): Promise<DocPage | null> {
  const filePath = slugToFile(slug);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
  const parsed = matter(raw);
  let body = parsed.content;
  body = rewriteHeadingIds(body);
  body = convertAdmonitions(body);
  body = fixLinks(body, slug);
  const toc = extractToc(parsed.content);
  return {
    slug,
    source: body,
    frontmatter: parsed.data,
    toc,
  };
}

export async function listAllSlugs(): Promise<string[][]> {
  const out: string[][] = [];
  async function walk(dir: string, prefix: string[]) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full, [...prefix, e.name]);
      } else if (e.isFile() && e.name.endsWith('.md')) {
        const base = e.name.replace(/\.md$/, '');
        if (base === 'index' && prefix.length === 0) {
          out.push([]); // root
        } else {
          out.push([...prefix, base]);
        }
      }
    }
  }
  await walk(CONTENT_DIR, []);
  return out;
}

export function titleFromFrontmatter(fm: Record<string, any>, fallback?: string): string {
  return fm.title || fallback || 'Untitled';
}

export interface SearchEntry {
  slug: string[];
  href: string;
  title: string;
  body: string;
  headings: TocEntry[];
}

function extractH1(md: string): string | null {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function buildSearchIndex(): Promise<SearchEntry[]> {
  const slugs = await listAllSlugs();
  const entries: SearchEntry[] = [];
  for (const slug of slugs) {
    const filePath = slugToFile(slug);
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }
    const parsed = matter(raw);
    const title =
      parsed.data.title ||
      extractH1(parsed.content) ||
      slug[slug.length - 1] ||
      'Untitled';
    entries.push({
      slug,
      href: '/docs/' + slug.join('/'),
      title,
      body: stripMarkdown(parsed.content),
      headings: extractToc(parsed.content),
    });
  }
  return entries;
}
