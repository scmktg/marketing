import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beachie-lake disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-beachie-deep text-beachie-cream hover:bg-beachie-lake",
        outline:
          "border border-beachie-deep bg-transparent text-beachie-deep hover:bg-beachie-sand",
        ghost: "hover:bg-beachie-sand text-beachie-deep",
        danger: "bg-beachie-coral text-white hover:bg-beachie-coral/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
