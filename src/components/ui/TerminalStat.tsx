import * as React from 'react';

import { cn } from '@/lib/utils';

interface TerminalStatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'cyan' | 'warning' | 'danger';
}

function toneClass(tone: TerminalStatProps['tone']) {
  if (tone === 'danger') {
    return 'text-white/70';
  }

  if (tone === 'warning') {
    return 'text-white/80';
  }

  if (tone === 'cyan') {
    return 'text-white';
  }

  return 'text-foreground';
}

export function TerminalStat({
  label,
  value,
  hint,
  tone = 'default',
  className,
  ...props
}: TerminalStatProps) {
  return (
    <div
      className={cn(
        'panel-card relative z-10 flex min-w-0 flex-col gap-4 px-5 py-5',
        className,
      )}
      {...props}
    >
      <div className="terminal-meta">{label}</div>
      <div className={cn('truncate text-xl leading-none font-medium uppercase', toneClass(tone))}>
        {value}
      </div>
      {hint ? <div className="text-muted-foreground text-[11px]">{hint}</div> : null}
    </div>
  );
}
