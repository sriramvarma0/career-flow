"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStorageProvider, getStorageKey } from "@/infrastructure/storage";
import { applicationSchema, noteSchema, uploadSchema } from "@/lib/validators";
import { type ActionResult } from "@/types/jobvault";
import {
  createApplication,
  deleteApplication,
  getApplicationById,
  updateApplicationWithTimeline,
  updateStatusHistoryTimeline,
} from "@/repositories/application-repository";
import {
  addApplicationNote,
  createDocument,
  deleteDocument,
  getDocumentById,
  getDocumentsForApplication,
  getUsedTags,
} from "@/repositories/document-repository";
import {
  createCustomStatus,
  getCustomStatuses,
} from "@/repositories/custom-status-repository";

function getSessionUserId(session: Awaited<ReturnType<typeof auth>>) {
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }
  return userId;
}

export async function createApplicationAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  const userId = getSessionUserId(session);

  const parsed = applicationSchema.safeParse({
    companyName: formData.get("companyName"),
    jobTitle: formData.get("jobTitle"),
    applicationReferenceId: formData.get("applicationReferenceId"),
    source: formData.get("source"),
    status: formData.get("status"),
    appliedDate: formData.get("appliedDate"),
    jobUrl: formData.get("jobUrl"),
    location: formData.get("location"),
    salary: formData.get("salary"),
    experience: formData.get("experience"),
    appliedPlatform: formData.get("appliedPlatform"),
    jobId: formData.get("jobId"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Please review the application fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const appliedDateVal = parsed.data.appliedDate ? new Date(parsed.data.appliedDate) : null;
  const initialStatus = parsed.data.status;
  
  const historyData: { previousStatus?: string | null; newStatus: string; changedAt: Date }[] = [];

  // We ALWAYS create an "Applied" stage by default
  historyData.push({
    previousStatus: null,
    newStatus: "Applied",
    changedAt: appliedDateVal || new Date(),
  });
  
  // If the initial status is different from "Applied", append it as the next stage
  if (initialStatus !== "Applied") {
    historyData.push({
      previousStatus: "Applied",
      newStatus: initialStatus,
      changedAt: new Date(),
    });
  }

  const application = await createApplication({
    userId,
    companyName: parsed.data.companyName,
    jobTitle: parsed.data.jobTitle,
    applicationReferenceId: parsed.data.applicationReferenceId || null,
    source: parsed.data.source,
    status: parsed.data.status,
    appliedDate: appliedDateVal,
    jobUrl: parsed.data.jobUrl || null,
    location: parsed.data.location || null,
    salary: parsed.data.salary || null,
    experience: parsed.data.experience || null,
    appliedPlatform: parsed.data.appliedPlatform || null,
    jobId: parsed.data.jobId || null,
    notes: parsed.data.notes || null,
    historyData,
  });

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true, message: "Application created.", data: { id: application.id } };
}

export async function updateApplicationAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  const userId = getSessionUserId(session);
  const applicationId = String(formData.get("id") ?? "");

  const existing = await getApplicationById(userId, applicationId);
  if (!existing) {
    return { ok: false, message: "Application not found." };
  }

  const parsed = applicationSchema.safeParse({
    id: applicationId,
    companyName: formData.get("companyName"),
    jobTitle: formData.get("jobTitle"),
    applicationReferenceId: formData.get("applicationReferenceId"),
    source: formData.get("source"),
    status: formData.get("status"),
    appliedDate: formData.get("appliedDate"),
    jobUrl: formData.get("jobUrl"),
    location: formData.get("location"),
    salary: formData.get("salary"),
    experience: formData.get("experience"),
    appliedPlatform: formData.get("appliedPlatform"),
    jobId: formData.get("jobId"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Please review the application fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateApplicationWithTimeline({
      applicationId,
      existingStatus: existing.status,
      companyName: parsed.data.companyName,
      jobTitle: parsed.data.jobTitle,
      applicationReferenceId: parsed.data.applicationReferenceId || null,
      source: parsed.data.source,
      status: parsed.data.status,
      appliedDate: parsed.data.appliedDate ? new Date(parsed.data.appliedDate) : null,
      jobUrl: parsed.data.jobUrl || null,
      location: parsed.data.location || null,
      salary: parsed.data.salary || null,
      experience: parsed.data.experience || null,
      appliedPlatform: parsed.data.appliedPlatform || null,
      jobId: parsed.data.jobId || null,
      notes: parsed.data.notes || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update application.";
    return { ok: false, message: msg };
  }

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true, message: "Application updated." };
}

export async function deleteApplicationAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  const userId = getSessionUserId(session);
  const applicationId = String(formData.get("id") ?? "");

  const application = await getApplicationById(userId, applicationId);
  if (!application) {
    return { ok: false, message: "Application not found." };
  }

  const documents = await getDocumentsForApplication(userId, applicationId);
  const storage = getStorageProvider();
  for (const doc of documents) {
    await storage.delete(doc.storageKey);
  }
  if (storage.deletePrefix) {
    await storage.deletePrefix(`users/user_${userId}/application_${applicationId}`);
  }

  await deleteApplication(applicationId);
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  redirect("/applications");
}

export async function addApplicationNoteAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  const userId = getSessionUserId(session);

  const parsed = noteSchema.safeParse({
    applicationId: formData.get("applicationId"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Please write a note first.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const application = await getApplicationById(userId, parsed.data.applicationId);
  if (!application) {
    return { ok: false, message: "Application not found." };
  }

  await addApplicationNote(parsed.data.applicationId, parsed.data.content);

  revalidatePath(`/applications/${parsed.data.applicationId}`);
  return { ok: true, message: "Note added." };
}

export async function uploadDocumentAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  const userId = getSessionUserId(session);

  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  const parsed = uploadSchema.safeParse({ applicationId: formData.get("applicationId") });

  if (!parsed.success || files.length === 0) {
    return { ok: false, message: "Choose a file to upload." };
  }

  if (files.some(f => f.size > 100 * 1024 * 1024)) {
    return { ok: false, message: "Files must be 100 MB or smaller." };
  }

  const allowedMimeTypes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/png",
    "image/jpeg",
    "application/zip",
    "video/mp4",
    "video/quicktime",
  ]);

  if (files.some(f => !allowedMimeTypes.has(f.type))) {
    return { ok: false, message: "That file type is not supported." };
  }

  const application = await getApplicationById(userId, parsed.data.applicationId);
  if (!application) {
    return { ok: false, message: "Application not found." };
  }

  const storage = getStorageProvider();
  const tagsStr = String(formData.get("tags") ?? "").trim();
  const tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean).join(",") : "";

  for (const file of files) {
    const originalFileName = file.name;
    const storedFileName = `${Date.now()}-${originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storageKey = getStorageKey(userId, parsed.data.applicationId, storedFileName);
    const arrayBuffer = await file.arrayBuffer();
    await storage.upload(storageKey, Buffer.from(arrayBuffer), file.type);

    await createDocument({
      applicationId: parsed.data.applicationId,
      fileName: storedFileName,
      originalFileName,
      storageKey,
      fileSize: file.size,
      mimeType: file.type,
      tags,
    });
  }

  revalidatePath(`/applications/${parsed.data.applicationId}`);
  return { ok: true, message: files.length === 1 ? "Document uploaded." : "Documents uploaded." };
}

export async function deleteDocumentAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  const userId = getSessionUserId(session);
  const documentId = String(formData.get("documentId") ?? "");

  const document = await getDocumentById(userId, documentId);

  if (!document) {
    return { ok: false, message: "Document not found." };
  }

  const storage = getStorageProvider();
  await deleteDocument(documentId);
  await storage.delete(document.storageKey);
  revalidatePath(`/applications/${document.applicationId}`);
  return { ok: true, message: "Document deleted." };
}

export async function updateStatusHistoryAction(
  applicationId: string,
  stages: { status: string; date: string }[]
): Promise<ActionResult> {
  const session = await auth();
  const userId = getSessionUserId(session);

  const application = await getApplicationById(userId, applicationId);
  if (!application) {
    return { ok: false, message: "Application not found." };
  }

  // 1. If appliedDate is present, the timeline must contain the "Applied" status
  if (application.appliedDate) {
    const hasAppliedStage = stages.some((s) => s.status === "Applied");
    if (!hasAppliedStage) {
      return {
        ok: false,
        message: "To remove the 'Applied' stage, you must clear the Applied Date in the application form details first.",
      };
    }
  }

  // 2. Primary statuses (default stages) cannot be repeated in the status timeline
  const defaultStatuses = ["Applied", "Assessment", "Interview", "HRRound", "Offer", "Rejected", "Withdrawn"];
  const primaryStatusesInStages = stages
    .map((s) => s.status)
    .filter((status) => defaultStatuses.includes(status));

  const uniquePrimaryStatuses = new Set(primaryStatusesInStages);
  if (uniquePrimaryStatuses.size !== primaryStatusesInStages.length) {
    const duplicates = primaryStatusesInStages.filter((item, index) => primaryStatusesInStages.indexOf(item) !== index);
    return {
      ok: false,
      message: `Primary statuses cannot be repeated in the timeline. Duplicate(s) found: ${Array.from(new Set(duplicates)).join(", ")}.`,
    };
  }

  const sortedStages = [...stages].sort((a, b) => {
    const getStageTime = (stage: { status: string; date: string }) => {
      if (stage.status === "Applied" && !stage.date) {
        return 0;
      }
      return stage.date && !isNaN(Date.parse(stage.date)) ? new Date(stage.date).getTime() : Date.now();
    };
    return getStageTime(a) - getStageTime(b);
  });

  const appliedStage = sortedStages.find((s) => s.status === "Applied");
  const appliedDate = appliedStage && appliedStage.date && !isNaN(Date.parse(appliedStage.date))
    ? new Date(appliedStage.date)
    : null;

  await updateStatusHistoryTimeline(applicationId, sortedStages, appliedDate);

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true, message: "Timeline updated successfully." };
}

export async function getUsedTagsAction(): Promise<ActionResult<string[]>> {
  const session = await auth();
  const userId = getSessionUserId(session);

  try {
    const tags = await getUsedTags(userId);
    return { ok: true, data: tags };
  } catch (error) {
    return { ok: false, message: "Could not fetch tags." };
  }
}

export async function getCustomStatusesAction(): Promise<ActionResult<{ name: string; linkedStatus: string }[]>> {
  const session = await auth();
  const userId = getSessionUserId(session);

  try {
    const customStatuses = await getCustomStatuses(userId);
    return { ok: true, data: customStatuses };
  } catch (error) {
    return { ok: false, message: "Could not fetch custom statuses." };
  }
}

export async function createCustomStatusAction(name: string, linkedStatus: string): Promise<ActionResult<{ name: string; linkedStatus: string }>> {
  const session = await auth();
  const userId = getSessionUserId(session);

  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, message: "Status name cannot be empty." };
  }

  const defaultStatuses = [
    "Applied",
    "Assessment",
    "Interview",
    "HRRound",
    "Offer",
    "Rejected",
    "Withdrawn",
  ];
  if (!defaultStatuses.includes(linkedStatus)) {
    return { ok: false, message: "Invalid linked default status." };
  }

  // Check if it's already one of the default statuses
  const isDefault = defaultStatuses.some((s) => s.toLowerCase() === trimmed.toLowerCase());

  if (isDefault) {
    return { ok: false, message: "This is a default status." };
  }

  try {
    const created = await createCustomStatus(userId, trimmed, linkedStatus);
    return { ok: true, message: "Custom status added.", data: created };
  } catch (error) {
    return { ok: false, message: "Could not save custom status." };
  }
}

