import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ApplicationForm } from "@/components/forms/application-form";
import { getApplicationDetail } from "@/services/application-service";

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const application = await getApplicationDetail(session.user.id, id);

  if (!application) {
    notFound();
  }

  return (
    <AppShell title="Edit application" subtitle="Update the core record and status history in one place.">
      <ApplicationForm
        mode="edit"
        defaultValues={{
          id: application.id,
          companyName: application.companyName,
          jobTitle: application.jobTitle,
          applicationReferenceId: application.applicationReferenceId ?? "",
          source: application.source as any,
          status: application.status,
          appliedDate: application.appliedDate ? application.appliedDate.toISOString().slice(0, 10) : "",
          jobUrl: application.jobUrl ?? "",
          location: application.location ?? "",
          salary: application.salary ?? "",
          experience: application.experience ?? "",
          appliedPlatform: application.appliedPlatform ?? "",
          jobId: application.jobId ?? "",
          notes: application.notes ?? "",
        }}
      />
    </AppShell>
  );
}
