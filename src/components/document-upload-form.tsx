"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadDocumentAction, getUsedTagsAction } from "@/actions/applications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type DocumentUploadFormProps = {
  applicationId: string;
};

export function DocumentUploadForm({ applicationId }: DocumentUploadFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tagsValue, setTagsValue] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRecommendations([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchTags() {
      const res = await getUsedTagsAction();
      if (res.ok && res.data) {
        setAllTags(res.data);
      }
    }
    fetchTags();
  }, []);

  const showRecommendations = (value: string) => {
    // Find current active segment (after last comma)
    const parts = value.split(",");
    const currentSegment = parts[parts.length - 1].trim();

    // Already selected tags
    const selected = new Set(
      parts.slice(0, parts.length - 1).map((p) => p.trim().toLowerCase())
    );

    // Find matching suggestions from allTags
    const matches = allTags.filter((tag) => {
      const lowerTag = tag.toLowerCase();
      // If we have a typed segment, check if it matches; otherwise show all
      const isMatch = currentSegment
        ? lowerTag.includes(currentSegment.toLowerCase()) && lowerTag !== currentSegment.toLowerCase()
        : true;

      return isMatch && !selected.has(lowerTag);
    });

    setRecommendations(matches);
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagsValue(value);
    showRecommendations(value);
  };

  const selectRecommendation = (tag: string) => {
    const parts = tagsValue.split(",");
    // Replace the last segment with the clicked tag
    parts[parts.length - 1] = ` ${tag}`;
    // Join and add a comma + space at the end to prepare for the next tag
    const newValue = parts.join(",").trim() + ", ";
    setTagsValue(newValue);
    setRecommendations([]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      toast.error("Choose at least one file to upload.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await uploadDocumentAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Documents uploaded.");
      formElement.reset();
      setTagsValue("");
      setRecommendations([]);

      // Re-fetch tags to include newly added ones
      const tagsRes = await getUsedTagsAction();
      if (tagsRes.ok && tagsRes.data) {
        setAllTags(tagsRes.data);
      }

      router.refresh();
    } catch (error) {
      toast.error("An error occurred while uploading the files.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Files</label>
        <Input name="file" type="file" required multiple className="rounded-2xl border border-slate-200 bg-white" />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tags</label>
        <div className="relative">
          <Input
            name="tags"
            placeholder="Resume, Cover Letter, PDF"
            value={tagsValue}
            onChange={handleTagsChange}
            onFocus={() => showRecommendations(tagsValue)}
            autoComplete="off"
            className="rounded-2xl border border-slate-200 bg-white px-4 text-slate-800 w-full"
          />

          {recommendations.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 flex flex-col gap-0.5 max-h-[160px] overflow-y-auto"
            >
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block px-2 py-1 select-none">
                Suggestions
              </span>
              {recommendations.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => selectRecommendation(tag)}
                  className="w-full text-left text-xs font-semibold px-2.5 py-2 rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Uploading..." : "Upload files"}
      </Button>
    </form>
  );
}
