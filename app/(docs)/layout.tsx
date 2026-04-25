import { Sidebar } from '@/components/Sidebar';
import { buildSearchIndex } from '@/lib/content';

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const searchIndex = await buildSearchIndex();
  return (
    <div
      className="flex min-h-screen text-[#E6FEF4]"
      style={{ background: '#0D2B28' }}
    >
      <Sidebar searchIndex={searchIndex} />
      <main className="flex-1 overflow-y-auto w-full transition-all duration-300 min-w-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 md:px-12 pt-20 lg:pt-8 pb-16 transition-all duration-300 lg:pl-6">
          {children}
        </div>
      </main>
    </div>
  );
}
