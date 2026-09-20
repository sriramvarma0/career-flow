import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
};

export function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-blue-600 text-white shadow-sm shadow-blue-200 hover:bg-blue-500",
        variant === "secondary" && "bg-blue-50 text-blue-700 hover:bg-blue-100",
        variant === "outline" && "border border-blue-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700",
        variant === "ghost" && "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
        variant === "destructive" && "bg-rose-500 text-white hover:bg-rose-400",
        size === "default" && "h-11 px-5 text-sm",
        size === "sm" && "h-9 px-3 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        className,
      )}
      {...props}
    />
  );
}