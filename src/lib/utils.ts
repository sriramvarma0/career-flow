import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));

  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function normalizeContactValue(value: string, type: "EMAIL" | "PHONE") {
  const trimmed = value.trim();

  if (type === "EMAIL") {
    return trimmed.toLowerCase();
  }

  return trimmed.replace(/[^\d+]/g, "");
}

export function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}