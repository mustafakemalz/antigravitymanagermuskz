import * as React from 'react';

import { cn } from '@/lib/utils';

type PanelSectionHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  label: string;
  value?: string;
};

export function PanelSectionHeader({
  label,
  value,
  className,
  ...props
}: PanelSectionHeaderProps) {
  return (
    <div className={cn('panel-section-header', className)} {...props}>
      <span>{label}</span>
      {value ? <span className="text-[10px] text-white/70">{value}</span> : null}
    </div>
  );
}
