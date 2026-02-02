/**
 * Badge Component
 */

import { cn } from "@/lib/cn";

export interface BadgeProps {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "error";
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-primary text-primary-foreground": variant === "default",
          "bg-secondary text-secondary-foreground": variant === "secondary",
          "border border-input bg-background": variant === "outline",
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200":
            variant === "success",
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200":
            variant === "warning",
          "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200":
            variant === "error",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
