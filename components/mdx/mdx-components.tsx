import React from 'react';

function Diagram({
  src,
  alt = '',
  width = 540,
  caption,
}: {
  src: string;
  alt?: string;
  width?: number;
  caption?: string;
}) {
  return (
    <figure
      style={{
        margin: '1.75rem auto',
        textAlign: 'center',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{
          display: 'block',
          margin: '0 auto',
          width: '100%',
          maxWidth: `${width}px`,
          height: 'auto',
        }}
      />
      {caption ? (
        <figcaption
          style={{
            marginTop: '0.6rem',
            fontSize: '0.85rem',
            color: '#9CA3AF',
          }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export const mdxComponents: Record<string, React.ComponentType<any>> = {
  Diagram,
  h2: ({ children, id, ...props }) => (
    <h2 id={id} className="scroll-mt-20" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, id, ...props }) => (
    <h3 id={id} className="scroll-mt-20" {...props}>
      {children}
    </h3>
  ),
  a: ({ href, children, ...props }) => {
    const isExternal = href && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noreferrer' : undefined}
        {...props}
      >
        {children}
      </a>
    );
  },
  table: ({ children, ...props }) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full" {...props}>
        {children}
      </table>
    </div>
  ),
};
