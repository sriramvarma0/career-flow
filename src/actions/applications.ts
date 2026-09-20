"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma";
import { auth } from "@/lib/auth";
import { getStorageProvider, getStorageKey } from "@/infrastructure/storage";
import { applicationSchema, noteSchema, uploadSchema } from "@/lib/validators";
import { type ActionResult } from "@/types/jobvault";
import { getApplicationById } from "@/repositories/application-repository";

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
  
  const historyData: Prisma.StatusHistoryCreateWithoutApplicationInput[] = [];

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

  const application = await prisma.application.create({
    data: {
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
      statusHistory: {
        create: historyData,
      },
    },
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

  const statusChanged = existing.status !== parsed.data.status;

  if (statusChanged) {
    const defaultStatuses = ["Applied", "Assessment", "Interview", "HRRound", "Offer", "Rejected", "Withdrawn"];
    if (defaultStatuses.includes(parsed.data.status)) {
      const alreadyExists = await prisma.statusHistory.findFirst({
        where: { applicationId, newStatus: parsed.data.status },
      });
      if (alreadyExists) {
        return {
          ok: false,
          message: `Primary status '${parsed.data.status === "HRRound" ? "HR Round" : parsed.data.status}' already exists in this application's timeline and cannot be repeated.`,
        };
      }
    }
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.application.update({
      where: { id: applicationId },
      data: {
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
      },
    });

    if (statusChanged) {
      await tx.statusHistory.create({
        data: {
          applicationId,
          previousStatus: existing.status,
          newStatus: parsed.data.status,
          changedAt: new Date(),
        },
      });
    }

    // Sync the "Applied" status history stage with the new appliedDate
    const newAppliedDate = parsed.data.appliedDate ? new Date(parsed.data.appliedDate) : null;
    if (newAppliedDate) {
      const appliedStage = await tx.statusHistory.findFirst({
        where: { applicationId, newStatus: "Applied" },
      });
      if (appliedStage) {
        await tx.statusHistory.update({
          where: { id: appliedStage.id },
          data: { changedAt: newAppliedDate },
        });
      } else {
        await tx.statusHistory.create({
          data: {
            applicationId,
            previousStatus: null,
            newStatus: "Applied",
            changedAt: newAppliedDate,
          },
        });
      }
    }
  });

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

  const documents = await prisma.document.findMany({ where: { applicationId, application: { userId } } });
  const storage = getStorageProvider();
  for (const doc of documents) {
    await storage.delete(doc.storageKey);
  }
  if (storage.deletePrefix) {
    await storage.deletePrefix(`users/user_${userId}/application_${applicationId}`);
  }

  await prisma.application.delete({ where: { id: applicationId } });
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

  await prisma.applicationNote.create({
    data: {
      applicationId: parsed.data.applicationId,
      content: parsed.data.content,
    },
  });

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

    await prisma.document.create({
      data: {
        applicationId: parsed.data.applicationId,
        fileName: storedFileName,
        originalFileName,
        storageKey,
        fileSize: file.size,
        mimeType: file.type,
        tags,
      },
    });
  }

  revalidatePath(`/applications/${parsed.data.applicationId}`);
  return { ok: true, message: files.length === 1 ? "Document uploaded." : "Documents uploaded." };
}

export async function deleteDocumentAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  const userId = getSessionUserId(session);
  const documentId = String(formData.get("documentId") ?? "");

  const document = await prisma.document.findFirst({
    where: { id: documentId, application: { userId } },
  });

  if (!document) {
    return { ok: false, message: "Document not found." };
  }

  const storage = getStorageProvider();
  await prisma.document.delete({ where: { id: documentId } });
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

  // Delete all existing status history for this application
  await prisma.statusHistory.deleteMany({
    where: { applicationId },
  });

  // Create new status history records sequentially to ensure insertion order matches chronological date order
  for (let i = 0; i < sortedStages.length; i++) {
    const stage = sortedStages[i];
    const parsedDate = stage.date === "" ? null : (stage.date && !isNaN(Date.parse(stage.date)) ? new Date(stage.date) : new Date());
    await prisma.statusHistory.create({
      data: {
        applicationId,
        previousStatus: i > 0 ? sortedStages[i - 1].status : null,
        newStatus: stage.status,
        changedAt: parsedDate,
      },
    });
  }

  const lastStage = sortedStages[sortedStages.length - 1];
  const appliedStage = sortedStages.find((s) => s.status === "Applied");
  const appliedDate = appliedStage && appliedStage.date && !isNaN(Date.parse(appliedStage.date))
    ? new Date(appliedStage.date)
    : null;

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      ...(lastStage ? { status: lastStage.status } : {}),
      appliedDate,
    },
  });

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true, message: "Timeline updated successfully." };
}

export async function getUsedTagsAction(): Promise<ActionResult<string[]>> {
  const session = await auth();
  const userId = getSessionUserId(session);

  try {
    const documents = await prisma.document.findMany({
      where: {
        application: {
          userId,
        },
      },
      select: {
        tags: true,
      },
    });

    const uniqueTags = new Set<string>();
    documents.forEach((doc) => {
      if (doc.tags) {
        doc.tags.split(",").forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) {
            uniqueTags.add(trimmed);
          }
        });
      }
    });

    return { ok: true, data: Array.from(uniqueTags) };
  } catch (error) {
    return { ok: false, message: "Could not fetch tags." };
  }
}

export async function getCustomStatusesAction(): Promise<ActionResult<{ name: string; linkedStatus: string }[]>> {
  const session = await auth();
  const userId = getSessionUserId(session);

  try {
    const customStatuses = await prisma.customStatus.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { name: true, linkedStatus: true },
    });
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
    const existing = await prisma.customStatus.findUnique({
      where: {
        userId_name: {
          userId,
          name: trimmed,
        },
      },
    });

    if (existing) {
      return { ok: true, message: "Status already exists.", data: existing };
    }

    const created = await prisma.customStatus.create({
      data: {
        userId,
        name: trimmed,
        linkedStatus,
      },
    });

    return { ok: true, message: "Custom status added.", data: created };
  } catch (error) {
    return { ok: false, message: "Could not save custom status." };
  }
}
