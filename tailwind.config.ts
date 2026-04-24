import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx}', './content/**/*.md'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fg: {
          DEFAULT: '#FDF8ED',
          muted: '#A89E8A',
        },
        brand: '#14B87B',
      },
      fontFamily: {
        sans: ['var(--font-host-grotesk)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      typography: () => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': '#FDF8ED',
            '--tw-prose-headings': '#FFFFFF',
            '--tw-prose-lead': '#FDF8ED',
            '--tw-prose-links': '#14B87B',
            '--tw-prose-bold': '#FFFFFF',
            '--tw-prose-counters': '#A89E8A',
            '--tw-prose-bullets': 'rgba(253, 248, 237, 0.4)',
            '--tw-prose-hr': 'rgba(253, 248, 237, 0.08)',
            '--tw-prose-quotes': '#FDF8ED',
            '--tw-prose-quote-borders': '#14B87B',
            '--tw-prose-captions': '#A89E8A',
            '--tw-prose-code': '#14B87B',
            '--tw-prose-pre-code': '#FDF8ED',
            '--tw-prose-pre-bg': 'rgba(0, 0, 0, 0.35)',
            '--tw-prose-th-borders': 'rgba(253, 248, 237, 0.12)',
            '--tw-prose-td-borders': 'rgba(253, 248, 237, 0.06)',
            maxWidth: 'none',
            color: '#FDF8ED',
            h1: {
              fontWeight: '300',
              fontSize: '3rem',
              letterSpacing: '-0.02em',
              lineHeight: '1.1',
              color: '#FFFFFF',
              marginBottom: '2rem',
              marginTop: '3rem',
            },
            'h1:first-child': {
              marginTop: 0,
            },
            h2: {
              fontWeight: '300',
              fontSize: '2rem',
              letterSpacing: '-0.015em',
              lineHeight: '1.2',
              color: '#FFFFFF',
              marginTop: '3rem',
              marginBottom: '1.25rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid rgba(253, 248, 237, 0.08)',
            },
            h3: {
              fontWeight: '500',
              fontSize: '1.25rem',
              color: '#FFFFFF',
              marginTop: '2rem',
              marginBottom: '1rem',
            },
            h4: { fontWeight: '600', color: '#FFFFFF' },
            p: {
              color: '#FDF8ED',
              lineHeight: '1.75',
              fontSize: '1.0625rem',
            },
            'ul > li': { color: '#FDF8ED', lineHeight: '1.7' },
            'ol > li': { color: '#FDF8ED', lineHeight: '1.7' },
            a: {
              color: '#14B87B',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(20, 184, 123, 0.3)',
              textUnderlineOffset: '3px',
              fontWeight: '400',
              transition: 'color .15s, text-decoration-color .15s',
            },
            'a:hover': {
              color: '#3DD18F',
              textDecorationColor: '#3DD18F',
            },
            strong: { color: '#FFFFFF', fontWeight: '600' },
            table: {
              fontSize: '0.95rem',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
            },
            'thead th': {
              color: '#A89E8A',
              fontWeight: '500',
              fontSize: '0.8rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              paddingBottom: '0.75rem',
              borderBottomColor: 'rgba(253, 248, 237, 0.12)',
            },
            'tbody td': {
              paddingTop: '0.75rem',
              paddingBottom: '0.75rem',
              borderBottomColor: 'rgba(253, 248, 237, 0.06)',
            },
            blockquote: {
              borderLeftWidth: '2px',
              fontStyle: 'normal',
              fontWeight: '400',
              color: '#FDF8ED',
            },
            pre: {
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(253, 248, 237, 0.06)',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              fontSize: '0.9rem',
              lineHeight: '1.65',
            },
          },
        },
      }),
    },
  },
  plugins: [typography],
};

export default config;
