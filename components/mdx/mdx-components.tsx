import React from 'react';

export const mdxComponents: Record<string, React.ComponentType<any>> = {
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
