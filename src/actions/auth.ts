"use server";

import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/password";
import { normalizeContactValue } from "@/lib/utils";
import { registerSchema, forgotPasswordSchema, resetPasswordSchema, profileSchema, contactUpdateSchema } from "@/lib/validators";
import { auth } from "@/lib/auth";
import { type ActionResult } from "@/types/jobvault";
import {
  findExistingContactForRegistration,
  createUserWithContacts,
  getUserByNormalizedContact,
  createPasswordResetToken,
  consumePasswordResetToken,
  updateUserProfile,
  findExistingContact,
  upsertUserContact,
} from "@/repositories/user-repository";

function serializeError(error: unknown): ActionResult {
  if (error instanceof Error) {
    return { ok: false, message: error.message };
  }

  return { ok: false, message: "Something went wrong." };
}

export async function registerUser(formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    primaryEmail: formData.get("primaryEmail"),
    primaryPhone: formData.get("primaryPhone"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const payload = parsed.data;
  const normalizedEmail = normalizeContactValue(payload.primaryEmail, "EMAIL");
  const normalizedPhone = normalizeContactValue(payload.primaryPhone, "PHONE");

  const existingContact = await findExistingContactForRegistration(normalizedEmail, normalizedPhone);

  if (existingContact) {
    return {
      ok: false,
      message: "That email or phone is already in use.",
    };
  }

  try {
    await createUserWithContacts({
      fullName: payload.fullName,
      passwordHash: await hashPassword(payload.password),
      primaryEmail: payload.primaryEmail,
      normalizedEmail,
      primaryPhone: payload.primaryPhone,
      normalizedPhone,
    });

    revalidatePath("/login");
    return { ok: true, message: "Account created. Please sign in." };
  } catch (error) {
    return serializeError(error);
  }
}

export async function requestPasswordReset(formData: FormData): Promise<ActionResult<{ token: string }>> {
  const parsed = forgotPasswordSchema.safeParse({ identifier: formData.get("identifier") });

  if (!parsed.success) {
    return { ok: false, message: "Enter an email address or phone number." };
  }

  const identifier = parsed.data.identifier.trim();
  const normalizedIdentifier = identifier.includes("@")
    ? normalizeContactValue(identifier, "EMAIL")
    : normalizeContactValue(identifier, "PHONE");

  const contact = await getUserByNormalizedContact(normalizedIdentifier);

  if (!contact) {
    return { ok: true, message: "If the account exists, a reset token has been generated.", data: { token: "" } };
  }

  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  await createPasswordResetToken({
    userId: contact.user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 1000 * 60 * 30),
  });

  return {
    ok: true,
    message: "Reset token created. Use it on the reset password page.",
    data: { token },
  };
}

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const newPasswordHash = await hashPassword(parsed.data.password);

  const success = await consumePasswordResetToken(tokenHash, newPasswordHash);

  if (!success) {
    return { ok: false, message: "That reset token is invalid or has expired." };
  }

  revalidatePath("/login");
  return { ok: true, message: "Password updated successfully." };
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = profileSchema.safeParse({ fullName: formData.get("fullName") });
  if (!parsed.success) {
    return { ok: false, message: "Please provide a valid full name.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await updateUserProfile(session.user.id, parsed.data.fullName);

  revalidatePath("/profile");
  return { ok: true, message: "Profile updated." };
}

export async function updateContact(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = contactUpdateSchema.safeParse({
    id: formData.get("id") || undefined,
    type: formData.get("type"),
    value: formData.get("value"),
    isPrimary: formData.get("isPrimary"),
    isVerified: formData.get("isVerified"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Please fix the contact fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const normalizedValue = normalizeContactValue(parsed.data.value, parsed.data.type);
  const existing = await findExistingContact(normalizedValue, parsed.data.id);

  if (existing) {
    return { ok: false, message: "That email or phone number already exists." };
  }

  await upsertUserContact({
    id: parsed.data.id,
    userId: session.user.id,
    type: parsed.data.type,
    value: parsed.data.value,
    normalizedValue,
    isPrimary: parsed.data.isPrimary,
    isVerified: parsed.data.isVerified,
  });

  revalidatePath("/profile");
  return { ok: true, message: "Contact updated." };
}