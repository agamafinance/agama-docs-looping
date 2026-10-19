import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import { loadDoc, listAllSlugs } from '@/lib/content';
import { mdxComponents } from '@/components/mdx/mdx-components';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PrevNext } from '@/components/PrevNext';
import type { Metadata } from 'next';

// The set of pages is the set of files in content/, enumerated below, and
// anything else is a 404. Saying so matters for more than tidiness: with
// dynamicParams left at its default, Vercel caches an unknown path for one
// second, which means a crawler walking made up URLs invokes this function on
// every request, forever. Turning it off makes a path that does not exist a
// static 404 served by the CDN, with no function behind it.
export const dynamicParams = false;

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
  return { title: { absolute: 'Agama Documentation' } };
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
      <div className="prose max-w-none">
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
