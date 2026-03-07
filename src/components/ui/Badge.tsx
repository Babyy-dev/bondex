import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "neutral";
}

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
        {
          "bg-[#1A120B] text-white":             variant === "default",
          "bg-emerald-100 text-emerald-800":     variant === "success",
          "bg-amber-100 text-amber-800":         variant === "warning",
          "bg-red-100 text-red-700":             variant === "error",
          "bg-[#F8F3EC] text-[#7A6252]":         variant === "info",
          "bg-[#F0E8DB] text-[#A89080]":         variant === "neutral",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
