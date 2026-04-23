import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import { loadDoc, listAllSlugs, titleFromFrontmatter } from '@/lib/content';
import { mdxComponents } from '@/components/mdx/mdx-components';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PrevNext } from '@/components/PrevNext';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  const slugs = await listAllSlugs();
  return slugs.map((slug) => ({ slug: slug.length > 0 ? slug : undefined }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug = [] } = await params;
  const doc = await loadDoc(slug);
  if (!doc) return {};
  const h1 = doc.source.match(/^#\s+(.+)$/m)?.[1];
  const title = titleFromFrontmatter(doc.frontmatter, h1);
  return { title };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const doc = await loadDoc(slug);
  if (!doc) notFound();

  const prettyCodeOptions = {
    theme: 'github-dark-default',
    keepBackground: false,
    defaultLang: 'txt',
  };

  return (
    <article>
      <Breadcrumbs />
      <div className="prose prose-invert max-w-none">
        <MDXRemote
          source={doc.source}
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [
                rehypeSlug,
                [rehypeAutolinkHeadings, { behavior: 'wrap', properties: { className: ['heading-link'] } }],
                [rehypePrettyCode, prettyCodeOptions],
              ],
            },
          }}
        />
      </div>
      <PrevNext />
    </article>
  );
}
