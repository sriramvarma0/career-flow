import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-11 w-full rounded-2xl border border-blue-100 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}