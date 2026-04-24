import * as React from 'react';

import { cn } from '@/lib/utils';

type LedProgressTone = 'cyan' | 'warning' | 'danger';

interface LedProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  tone?: LedProgressTone;
}

function clamp(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function toneClass(tone: LedProgressTone) {
  if (tone === 'warning') {
    return 'panel-led-fill-warning';
  }

  if (tone === 'danger') {
    return 'panel-led-fill-danger';
  }

  return 'panel-led-fill';
}

export function LedProgress({
  value,
  tone = 'cyan',
  className,
  ...props
}: LedProgressProps) {
  const safeValue = clamp(value);

  return (
    <div className={cn('panel-led-track', className)} {...props}>
      <div
        className={cn('transition-[width] duration-1000 ease-in-out', toneClass(tone))}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
