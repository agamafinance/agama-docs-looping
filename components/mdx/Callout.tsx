import { Info, AlertTriangle, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import clsx from 'clsx';
import React from 'react';

type CalloutType = 'note' | 'info' | 'tip' | 'warning' | 'danger' | 'success';

const styles: Record<CalloutType, { icon: React.ReactNode; border: string; bg: string; fg: string }> = {
  note: {
    icon: <Info className="w-4 h-4" />,
    border: 'border-[#2a2a2a]',
    bg: 'bg-[#141414]',
    fg: 'text-fg-muted',
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    border: 'border-[#1e3a5f]',
    bg: 'bg-[#0b1a2a]',
    fg: 'text-[#8ab4f8]',
  },
  tip: {
    icon: <Lightbulb className="w-4 h-4" />,
    border: 'border-[#1b4a32]',
    bg: 'bg-[#0b1f13]',
    fg: 'text-brand',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    border: 'border-[#5c4a1b]',
    bg: 'bg-[#231b08]',
    fg: 'text-[#e8c468]',
  },
  danger: {
    icon: <AlertCircle className="w-4 h-4" />,
    border: 'border-[#5a2626]',
    bg: 'bg-[#220f0f]',
    fg: 'text-[#ef6767]',
  },
  success: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    border: 'border-[#1b4a32]',
    bg: 'bg-[#0b1f13]',
    fg: 'text-brand',
  },
};

export function Callout({
  type = 'note',
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}) {
  const s = styles[type] || styles.note;
  return (
    <div className={clsx('callout my-5', s.border, s.bg)}>
      <div className={clsx('callout-icon mt-0.5', s.fg)}>{s.icon}</div>
      <div className="callout-body">
        {title && <div className={clsx('font-medium mb-1', s.fg)}>{title}</div>}
        <div className="text-fg-muted leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
