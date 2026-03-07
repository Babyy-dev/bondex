import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  selected?: boolean;
}

export function Card({ className, hoverable, selected, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-3xl border border-[#EDE8DF] shadow-sm",
        hoverable && "cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        selected && "border-[#1A120B] border-2 shadow-md ring-1 ring-[#1A120B]/10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
