import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx}', './content/**/*.md'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0a',
          soft: '#111111',
          raised: '#161616',
          input: '#1a1a1a',
        },
        line: {
          DEFAULT: '#1f1f1f',
          soft: '#262626',
        },
        fg: {
          DEFAULT: '#E9EDF2',
          muted: '#9BA9B6',
          dim: '#6B7682',
        },
        brand: {
          DEFAULT: '#26E994',
          dim: '#1bb477',
        },
      },
      fontFamily: {
        sans: ['var(--font-host-grotesk)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        prose: '48rem',
      },
      fontSize: {
        '4xl': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '300' }],
        '3xl': ['1.875rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '300' }],
      },
      typography: () => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': '#E9EDF2',
            '--tw-prose-headings': '#FFFFFF',
            '--tw-prose-lead': '#E9EDF2',
            '--tw-prose-links': '#26E994',
            '--tw-prose-bold': '#FFFFFF',
            '--tw-prose-counters': '#9BA9B6',
            '--tw-prose-bullets': '#6B7682',
            '--tw-prose-hr': '#262626',
            '--tw-prose-quotes': '#E9EDF2',
            '--tw-prose-quote-borders': '#26E994',
            '--tw-prose-captions': '#9BA9B6',
            '--tw-prose-code': '#E9EDF2',
            '--tw-prose-pre-code': '#E9EDF2',
            '--tw-prose-pre-bg': '#0f0f0f',
            '--tw-prose-th-borders': '#262626',
            '--tw-prose-td-borders': '#1f1f1f',
            maxWidth: 'none',
            h1: { fontWeight: '300', fontSize: '2.5rem', letterSpacing: '-0.02em', color: '#FFFFFF', marginTop: '3rem' },
            h2: { fontWeight: '300', fontSize: '1.875rem', letterSpacing: '-0.015em', color: '#FFFFFF', marginTop: '3rem', paddingBottom: '0.75rem', borderBottom: '1px solid #1f1f1f' },
            h3: { fontWeight: '500', fontSize: '1.25rem', color: '#FFFFFF', marginTop: '2rem' },
            h4: { fontWeight: '600', color: '#FFFFFF' },
            p: { color: '#E9EDF2', lineHeight: '1.75' },
            a: { color: '#26E994', textDecoration: 'none', fontWeight: '400', transition: 'color .15s' },
            'a:hover': { color: '#1bb477' },
            code: {
              color: '#26E994',
              fontWeight: '500',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: '#161616',
              fontSize: '0.9em',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            pre: {
              backgroundColor: '#0f0f0f',
              border: '1px solid #1f1f1f',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '0.9rem',
              lineHeight: '1.6',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: 0,
              color: '#E9EDF2',
              fontWeight: '400',
            },
            table: {
              fontSize: '0.95rem',
            },
            thead: {
              borderBottom: '1px solid #262626',
            },
            'thead th': {
              color: '#9BA9B6',
              fontWeight: '500',
              fontSize: '0.8rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              paddingBottom: '0.75rem',
            },
            'tbody td': {
              paddingTop: '0.75rem',
              paddingBottom: '0.75rem',
              borderBottomColor: '#1f1f1f',
            },
            blockquote: {
              borderLeftWidth: '2px',
              fontStyle: 'normal',
              fontWeight: '400',
            },
          },
        },
      }),
    },
  },
  plugins: [typography],
};

export default config;
