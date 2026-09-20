"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteApplicationAction, deleteDocumentAction } from "@/actions/applications";
import { toast } from "sonner";

export function DeleteApplicationButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm("Are you sure you want to delete this job application? This action cannot be undone.");
    if (!confirmed) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", applicationId);
      try {
        const result = await deleteApplicationAction(formData);
        if (result && !result.ok) {
          toast.error(result.message ?? "Failed to delete application.");
        }
      } catch (error) {
        // Next.js redirect throws an error, which is expected behavior for Server Action redirects.
        // We only show error if it is not a redirect-related event.
        if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
          return;
        }
        // In most cases Next.js handles redirect gracefully.
      }
    });
  };

  return (
    <Button
      variant="outline"
      type="button"
      className="border-slate-200 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
      onClick={handleDelete}
      disabled={isPending}
    >
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm("Are you sure you want to delete this document?");
    if (!confirmed) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", documentId);
      try {
        const result = await deleteDocumentAction(formData);
        if (result.ok) {
          toast.success(result.message ?? "Document deleted.");
          router.refresh();
        } else {
          toast.error(result.message ?? "Failed to delete document.");
        }
      } catch (error) {
        toast.error("An error occurred while deleting the document.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 w-8 rounded-full p-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
