"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Clipboard, ClipboardPaste } from "lucide-react";
import { applicationSchema, type ApplicationInput } from "@/lib/validators";
import { createApplicationAction, updateApplicationAction, getCustomStatusesAction, createCustomStatusAction } from "@/actions/applications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { applicationSourceValues, applicationStatuses } from "@/types/jobvault";
import { toast } from "sonner";

type ApplicationFormProps = {
  mode: "create" | "edit";
  defaultValues?: Partial<ApplicationInput> & { id?: string };
};

const aiApplicationPrompt = `Extract job application details from the job post or application confirmation I provide.

Return only valid JSON. Do not include markdown, comments, or extra text.

Use this exact shape:
{
  "companyName": "",
  "jobTitle": "",
  "applicationReferenceId": "",
  "source": "Other",
  "status": "Applied",
  "appliedDate": "",
  "jobUrl": "",
  "location": "",
  "salary": "",
  "experience": "",
  "appliedPlatform": "",
  "jobId": "",
  "notes": ""
}

Rules:
- companyName and jobTitle are required.
- source must be one of: CompanyWebsite, LinkedIn, Referral, Recruiter, JobBoard, Other.
- status must be one of: Applied, Assessment, Interview, HRRound, Offer, Rejected, Withdrawn.
- appliedDate must be YYYY-MM-DD or empty.
- jobUrl must be a full URL or empty.
- experience must be a string describing required/relevant experience or empty.
- appliedPlatform must be the name of the platform where the application was submitted (e.g. LinkedIn, Indeed, Company website) or empty.
- jobId must be the unique job posting identifier/ID if available, or empty.
- Use empty strings when information is missing.
- Put helpful extra details in notes, but keep it concise.`;

const applicationImportSchema = z.object({
  companyName: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  applicationReferenceId: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  appliedDate: z.string().optional().nullable(),
  jobUrl: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  salary: z.string().optional().nullable(),
  experience: z.string().optional().nullable(),
  appliedPlatform: z.string().optional().nullable(),
  jobId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ApplicationForm({ mode, defaultValues }: ApplicationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiJson, setAiJson] = useState("");

  const [currencyPrefix, setCurrencyPrefix] = useState("₹");
  const [salaryText, setSalaryText] = useState("");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      companyName: defaultValues?.companyName ?? "",
      jobTitle: defaultValues?.jobTitle ?? "",
      applicationReferenceId: defaultValues?.applicationReferenceId ?? "",
      source: defaultValues?.source ?? "Other",
      status: defaultValues?.status ?? "Applied",
      appliedDate: defaultValues?.appliedDate ?? getLocalDateString(),
      jobUrl: defaultValues?.jobUrl ?? "",
      location: defaultValues?.location ?? "",
      salary: defaultValues?.salary ?? "",
      experience: defaultValues?.experience ?? "",
      appliedPlatform: defaultValues?.appliedPlatform ?? "",
      jobId: defaultValues?.jobId ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  const [customStatuses, setCustomStatuses] = useState<{ name: string; linkedStatus: string }[]>([]);
  const [showNewStatusModal, setShowNewStatusModal] = useState(false);
  const [newStatusValue, setNewStatusValue] = useState("");
  const [newStatusCategory, setNewStatusCategory] = useState("Applied");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  useEffect(() => {
    getCustomStatusesAction().then((res) => {
      if (res.ok && res.data) {
        setCustomStatuses(res.data);
      }
    });
  }, []);

  const statusValue = watch("status");
  const statusRegister = register("status");

  // Initialize from defaultValues?.salary
  useEffect(() => {
    if (defaultValues?.salary) {
      const match = defaultValues.salary.match(/^(₹|\$|€|£|¥)\s*(.*)$/);
      if (match) {
        setCurrencyPrefix(match[1]);
        setSalaryText(match[2]);
      } else {
        setCurrencyPrefix("₹");
        setSalaryText(defaultValues.salary);
      }
    }
  }, [defaultValues?.salary]);

  // Sync to form value
  useEffect(() => {
    const finalSalary = salaryText.trim() ? `${currencyPrefix} ${salaryText.trim()}` : "";
    setValue("salary", finalSalary, { shouldDirty: true });
  }, [currencyPrefix, salaryText, setValue]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(aiApplicationPrompt);
      toast.success("AI prompt copied.");
    } catch {
      toast.error("Could not copy prompt.");
    }
  };

  const fillFromJson = () => {
    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(aiJson);
    } catch {
      toast.error("Paste valid JSON from the AI response.");
      return;
    }

    const parsed = applicationImportSchema.safeParse(parsedJson);

    if (!parsed.success) {
      console.error("Autofill JSON mismatch details:", parsed.error);
      toast.error("JSON does not match the application format. Check console for details.");
      return;
    }

    const data = parsed.data;

    // Sanitize source to a valid enum value, fallback to 'Other'
    let finalSource: any = "Other";
    if (data.source && applicationSourceValues.includes(data.source as any)) {
      finalSource = data.source;
    }

    // Sanitize status, fallback to 'Applied'
    let finalStatus = "Applied";
    if (data.status && data.status.trim() !== "") {
      finalStatus = data.status;
    }

    // Validate jobUrl is a valid absolute URL, otherwise default to empty
    let finalJobUrl = "";
    if (data.jobUrl) {
      try {
        new URL(data.jobUrl);
        finalJobUrl = data.jobUrl;
      } catch {
        finalJobUrl = "";
      }
    }

    // Set form fields safely
    if (data.companyName) setValue("companyName", data.companyName, { shouldDirty: true, shouldValidate: true });
    if (data.jobTitle) setValue("jobTitle", data.jobTitle, { shouldDirty: true, shouldValidate: true });
    if (data.applicationReferenceId) setValue("applicationReferenceId", data.applicationReferenceId, { shouldDirty: true, shouldValidate: true });
    setValue("source", finalSource, { shouldDirty: true, shouldValidate: true });
    setValue("status", finalStatus, { shouldDirty: true, shouldValidate: true });
    if (data.appliedDate) setValue("appliedDate", data.appliedDate, { shouldDirty: true, shouldValidate: true });
    setValue("jobUrl", finalJobUrl, { shouldDirty: true, shouldValidate: true });
    if (data.location) setValue("location", data.location, { shouldDirty: true, shouldValidate: true });
    
    if (data.salary) {
      const val = data.salary;
      const match = val.match(/^(₹|\$|€|£|¥)\s*(.*)$/);
      if (match) {
        setCurrencyPrefix(match[1]);
        setSalaryText(match[2]);
      } else {
        setCurrencyPrefix("₹");
        setSalaryText(val);
      }
      setValue("salary", val, { shouldDirty: true, shouldValidate: true });
    }
    
    if (data.experience) setValue("experience", data.experience, { shouldDirty: true, shouldValidate: true });
    if (data.appliedPlatform) setValue("appliedPlatform", data.appliedPlatform, { shouldDirty: true, shouldValidate: true });
    if (data.jobId) setValue("jobId", data.jobId, { shouldDirty: true, shouldValidate: true });
    if (data.notes) setValue("notes", data.notes, { shouldDirty: true, shouldValidate: true });

    toast.success("Form filled from JSON.");
  };

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const formData = new FormData();
    if (defaultValues?.id) formData.set("id", defaultValues.id);
    Object.entries(values).forEach(([key, value]) => formData.set(key, value ?? ""));

    const result = mode === "create"
      ? await createApplicationAction(formData)
      : await updateApplicationAction(formData);

    setIsSubmitting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message ?? "Saved.");
    router.push(result.data?.id ? `/applications/${result.data.id}` : "/applications");
    router.refresh();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create application" : "Edit application"}</CardTitle>
        <CardDescription>Track company details, status, and notes in a single record.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
          {mode === "create" ? (
            <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Fill with AI JSON</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Copy the prompt, send it with a job post or confirmation, then paste the JSON response here.
                  </p>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={copyPrompt}>
                  <Clipboard className="h-4 w-4" />
                  Copy prompt
                </Button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="ai-json">AI JSON</Label>
                  <Textarea
                    id="ai-json"
                    value={aiJson}
                    onChange={(event) => setAiJson(event.target.value)}
                    placeholder='{"companyName":"Acme","jobTitle":"Product Manager","source":"LinkedIn","status":"Applied"}'
                    className="min-h-24 bg-white"
                  />
                </div>
                <Button type="button" variant="outline" onClick={fillFromJson} disabled={!aiJson.trim()}>
                  <ClipboardPaste className="h-4 w-4" />
                  Fill form
                </Button>
              </div>
            </div>
          ) : null}

          <Field label="Company name" error={errors.companyName?.message}><Input {...register("companyName")} /></Field>
          <Field label="Job title" error={errors.jobTitle?.message}><Input {...register("jobTitle")} /></Field>
          <Field label="Application ID" error={errors.applicationReferenceId?.message}><Input {...register("applicationReferenceId")} /></Field>
          <Field label="Job ID" error={errors.jobId?.message}><Input placeholder="e.g. JOB-12345" {...register("jobId")} /></Field>
          <Field label="Applied date" error={errors.appliedDate?.message}><Input type="date" {...register("appliedDate")} /></Field>
          <Field label="Source" error={errors.source?.message}>
            <Select {...register("source")}>
              {applicationSourceValues.map((source) => (<option key={source} value={source}>{source.replace(/([A-Z])/g, " $1").trim()}</option>))}
            </Select>
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <Select
              {...statusRegister}
              onChange={async (e) => {
                if (e.target.value === "add-new") {
                  e.target.value = statusValue || "Applied";
                  setShowNewStatusModal(true);
                } else {
                  await statusRegister.onChange(e);
                }
              }}
            >
              {applicationStatuses.map((status) => (
                <option key={status} value={status}>
                  {status === "HRRound" ? "HR Round" : status}
                </option>
              ))}
              {customStatuses.map((status) => (
                <option key={status.name} value={status.name}>
                  {status.name}
                </option>
              ))}
              <option value="add-new">+ Add new...</option>
            </Select>
          </Field>
          <Field label="Job URL" error={errors.jobUrl?.message}><Input type="url" {...register("jobUrl")} /></Field>
          <Field label="Location" error={errors.location?.message}><Input {...register("location")} /></Field>
          <Field label="Experience" error={errors.experience?.message}><Input placeholder="e.g. 3+ years" {...register("experience")} /></Field>
          <Field label="Applied platform" error={errors.appliedPlatform?.message}><Input placeholder="e.g. LinkedIn, Indeed, Company website" {...register("appliedPlatform")} /></Field>
          <Field label="Salary" error={errors.salary?.message}>
            <div className="flex gap-2">
              <Select
                value={currencyPrefix}
                onChange={(e) => setCurrencyPrefix(e.target.value)}
                className="w-28 shrink-0 bg-slate-50 border-slate-200"
              >
                <option value="₹">₹ (INR)</option>
                <option value="$">$ (USD)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
                <option value="¥">¥ (JPY)</option>
              </Select>
              <Input
                value={salaryText}
                onChange={(e) => setSalaryText(e.target.value)}
                placeholder="e.g. 12 LPA"
                className="flex-1 bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>
          </Field>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save application"}</Button>
          </div>
        </form>
      </CardContent>

      {showNewStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-80 rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <h3 className="text-sm font-semibold text-slate-900">Add Custom Status</h3>
            <p className="text-xs text-slate-500">
              Create a new status for your application stages.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="custom-status-input" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status Name</Label>
                <Input
                  id="custom-status-input"
                  placeholder="e.g. Technical Round"
                  value={newStatusValue}
                  onChange={(e) => setNewStatusValue(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="custom-status-category" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Primary Category</Label>
                <Select
                  id="custom-status-category"
                  value={newStatusCategory}
                  onChange={(e) => setNewStatusCategory(e.target.value)}
                >
                  {applicationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status === "HRRound" ? "HR Round" : status}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNewStatusModal(false);
                  setNewStatusValue("");
                  setNewStatusCategory("Applied");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSavingStatus}
                onClick={async () => {
                  const trimmed = newStatusValue.trim();
                  if (!trimmed) {
                    toast.error("Status name cannot be empty.");
                    return;
                  }
                  setIsSavingStatus(true);
                  const result = await createCustomStatusAction(trimmed, newStatusCategory);
                  setIsSavingStatus(false);
                  if (result.ok && result.data) {
                    const savedStatus = result.data;
                    if (!customStatuses.some((cs) => cs.name === savedStatus.name)) {
                      setCustomStatuses((prev) => [...prev, savedStatus]);
                    }
                    setValue("status", savedStatus.name, { shouldDirty: true, shouldValidate: true });
                    setShowNewStatusModal(false);
                    setNewStatusValue("");
                    setNewStatusCategory("Applied");
                    toast.success(result.message || "Custom status added.");
                  } else {
                    toast.error(result.message || "Could not save custom status.");
                  }
                }}
              >
                {isSavingStatus ? "Saving..." : "Add"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
