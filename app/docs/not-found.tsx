import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="font-mono text-brand text-sm mb-4">404</div>
      <h1 className="text-3xl font-light mb-3 text-fg">Page not found</h1>
      <p className="text-fg-muted mb-6 max-w-md">
        The documentation page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/docs"
        className="text-sm text-brand hover:underline underline-offset-4"
      >
        ← Back to documentation
      </Link>
    </div>
  );
}
