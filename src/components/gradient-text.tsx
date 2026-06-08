import { cn } from "@/lib/utils";

/**
 * Gradient display text via background-clip. Applied as inline styles so
 * the CSS compiler (Lightning CSS) can't reorder the clip away, which it
 * does to utility rules that contain a var() in the gradient.
 *
 * variant="neutral" fades foreground to a dim grey (Apple-ish).
 * variant="brand"  bleeds foreground into the active --brand accent.
 */
const GRADIENTS = {
  neutral:
    "linear-gradient(180deg, oklch(0.99 0 0) 0%, oklch(0.72 0.008 285) 100%)",
  brand: "linear-gradient(110deg, oklch(0.99 0 0) 30%, var(--brand) 115%)",
} as const;

export function GradientText({
  children,
  className,
  variant = "neutral",
  as: Tag = "span",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof GRADIENTS;
  as?: React.ElementType;
}) {
  return (
    <Tag
      className={cn("inline-block", className)}
      style={{
        backgroundImage: GRADIENTS[variant],
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      {children}
    </Tag>
  );
}
