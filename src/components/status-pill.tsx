"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusColors, statusLabels } from "@/types/jobvault";
import { getCustomStatusesAction } from "@/actions/applications";

let cachedPromise: Promise<{ name: string; linkedStatus: string }[] | null> | null = null;

function fetchCustomStatuses() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!cachedPromise) {
    cachedPromise = getCustomStatusesAction().then((res) => {
      if (res.ok && res.data) {
        return res.data;
      }
      return null;
    });
  }
  return cachedPromise;
}

export function StatusPill({ status, category }: { status: string; category?: string }) {
  const [resolvedCategory, setResolvedCategory] = useState<string | undefined>(category);

  useEffect(() => {
    if (category) {
      setResolvedCategory(category);
      return;
    }
    fetchCustomStatuses().then((list) => {
      if (list) {
        const found = list.find((c) => c.name === status);
        if (found) {
          setResolvedCategory(found.linkedStatus);
        }
      }
    });
  }, [status, category]);

  const colorKey = resolvedCategory || status;
  const color = statusColors[colorKey as any] || "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-700/10";
  const label = statusLabels[status as any] || status;

  return <Badge className={cn("border border-transparent", color)}>{label}</Badge>;
}