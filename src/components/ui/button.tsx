import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xs text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:     'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:     'border border-input bg-background hover:bg-muted hover:text-foreground',
        secondary:   'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:       'hover:bg-muted hover:text-foreground',
        link:        'text-primary underline-offset-4 hover:underline',
        accent:      'bg-accent text-accent-foreground hover:bg-accent/90',
        success:     'bg-success text-success-foreground hover:bg-success/90',
        // legacy — kept for POS pages
        blue:    'bg-primary text-primary-foreground hover:bg-primary/90',
        gold:    'bg-warning text-warning-foreground hover:bg-warning/90',
        emerald: 'bg-success text-success-foreground hover:bg-success/90',
      },
      size: {
        default:   'h-9 px-4 py-2',
        sm:        'h-8 px-3 text-xs',
        xs:        'h-7 px-2 text-xs [&_svg]:size-3.5',
        lg:        'h-10 px-6',
        icon:      'h-9 w-9',
        'icon-sm': 'h-8 w-8',
        'icon-xs': 'h-7 w-7 [&_svg]:size-3.5',
        // legacy — POS pages reference these
        'xs-icon': 'h-7 w-7 p-0 [&_svg]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
