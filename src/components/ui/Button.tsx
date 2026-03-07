"use client";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          {
            "bg-[#1A120B] text-white hover:bg-[#2D1A0E] focus-visible:ring-[#1A120B]":
              variant === "primary",
            "bg-white text-[#1A120B] border border-[#EDE8DF] hover:bg-[#FEFCF8] focus-visible:ring-[#C8A96E]":
              variant === "secondary",
            "bg-transparent text-[#7A6252] hover:bg-[#F8F3EC] focus-visible:ring-[#C8A96E]":
              variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500":
              variant === "danger",
            "border-2 border-[#1A120B] text-[#1A120B] bg-transparent hover:bg-[#1A120B] hover:text-white focus-visible:ring-[#1A120B]":
              variant === "outline",
            "text-sm px-4 py-2 h-9":  size === "sm",
            "text-sm px-6 py-3 h-11": size === "md",
            "text-base px-8 py-4 h-14": size === "lg",
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {children}
          </span>
        ) : children}
      </button>
    );
  }
);
Button.displayName = "Button";
