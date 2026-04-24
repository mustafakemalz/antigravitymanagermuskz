import * as React from 'react';

import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

const ControlToggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'panel-toggle peer h-8 w-[60px] shrink-0 transition-all duration-200',
        'data-[state=checked]:border-white/20 data-[state=checked]:bg-white/[0.04]',
        'data-[state=unchecked]:border-white/10 data-[state=unchecked]:bg-[#121212]',
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute inset-y-[7px] left-1.5 right-1.5 flex items-center justify-between text-[9px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
        <span>On</span>
        <span>Off</span>
      </span>
      <SwitchPrimitive.Thumb
        className={cn(
          'block h-4 w-5 translate-x-1.5 rounded-none border border-white/10 bg-white/90 transition-transform duration-200',
          'data-[state=checked]:translate-x-[33px] data-[state=checked]:border-white/20 data-[state=checked]:bg-white',
        )}
      />
    </SwitchPrimitive.Root>
  );
});

ControlToggle.displayName = SwitchPrimitive.Root.displayName;

export { ControlToggle };
