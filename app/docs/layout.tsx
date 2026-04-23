import { Sidebar } from '@/components/Sidebar';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen text-[#E9EDF2]"
      style={{ background: 'lab(13.0536% -10.7839 -5.5266)' }}
    >
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full transition-all duration-300 min-w-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 md:px-12 pt-20 lg:pt-8 pb-16 transition-all duration-300 lg:pl-6">
          {children}
        </div>
      </main>
    </div>
  );
}
