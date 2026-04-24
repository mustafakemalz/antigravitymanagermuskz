import * as React from 'react';

import { Slot } from '@radix-ui/react-slot';

import { cn } from '@/lib/utils';

type PanelButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  warning?: boolean;
};

const PanelButton = React.forwardRef<HTMLButtonElement, PanelButtonProps>(
  ({ className, asChild = false, warning = false, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        type={type}
        className={cn(
          warning ? 'panel-button-warning' : 'panel-button',
          'h-11 min-w-[48px] px-5 disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

PanelButton.displayName = 'PanelButton';

export { PanelButton };
