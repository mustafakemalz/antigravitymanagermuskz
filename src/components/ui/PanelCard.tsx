import * as React from 'react';

import { cn } from '@/lib/utils';

type PanelCardProps = React.HTMLAttributes<HTMLDivElement> & {
  active?: boolean;
};

const PanelCard = React.forwardRef<HTMLDivElement, PanelCardProps>(
  ({ className, active = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(active ? 'panel-card-active' : 'panel-card', className)}
        {...props}
      />
    );
  },
);

PanelCard.displayName = 'PanelCard';

const PanelCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative z-10 border-b border-white/10 px-7 py-6', className)}
        {...props}
      />
    );
  },
);

PanelCardHeader.displayName = 'PanelCardHeader';

const PanelCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('relative z-10 px-7 py-7', className)} {...props} />;
  },
);

PanelCardContent.displayName = 'PanelCardContent';

const PanelCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative z-10 border-t border-white/10 px-7 py-5', className)}
        {...props}
      />
    );
  },
);

PanelCardFooter.displayName = 'PanelCardFooter';

export { PanelCard, PanelCardHeader, PanelCardContent, PanelCardFooter };
