import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addApplicationNoteAction, updateApplicationAction } from "@/actions/applications";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { DeleteApplicationButton, DeleteDocumentButton } from "@/components/delete-buttons";
import { StatusTimeline } from "@/components/status-timeline";
import { getApplicationDetail } from "@/services/application-service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusPill } from "@/components/status-pill";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const application = await getApplicationDetail(session.user.id, id);

  if (!application) {
    notFound();
  }

  async function handleUpdateStatus(formData: FormData) {
    "use server";
    await updateApplicationAction(formData);
  }

  async function handleAddNote(formData: FormData) {
    "use server";
    await addApplicationNoteAction(formData);
  }



  return (
    <AppShell
      title={application.companyName}
      subtitle={[
        application.jobTitle,
        application.location,
        application.salary
      ].filter(Boolean).join(" · ")}
      actions={(
        <>
          <DeleteApplicationButton applicationId={application.id} />
          <Link href={`/applications/${application.id}/edit`} className="inline-flex h-11 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-medium !text-white shadow-sm shadow-blue-200 transition hover:bg-blue-500">
            Edit
          </Link>
        </>
      )}
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] items-start">
        {/* Left Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application details</CardTitle>
              <CardDescription>Core information, links, and compensation data.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Detail label="Company" value={application.companyName} />
              <Detail label="Job title" value={application.jobTitle} />
              <Detail label="Application ID" value={application.applicationReferenceId ?? "-"} />
              <Detail label="Job ID" value={application.jobId ?? "-"} />
              <Detail label="Status" value={<StatusPill status={application.status} />} />
              <Detail label="Source" value={application.source.replace(/([A-Z])/g, " $1").trim()} />
              <Detail label="Applied date" value={formatDate(application.appliedDate)} />
              <Detail label="Job URL" value={application.jobUrl ? <a href={application.jobUrl} className="text-blue-600 hover:text-blue-500 hover:underline" target="_blank" rel="noreferrer">Open link</a> : "-"} />
              <Detail label="Location" value={application.location ?? "-"} />
              <Detail label="Salary" value={application.salary || "-"} />
              <Detail label="Experience" value={application.experience || "-"} />
              <Detail label="Applied platform" value={application.appliedPlatform || "-"} />
              <div className="md:col-span-2 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Notes</p>
                <p className="whitespace-pre-wrap rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm leading-7 text-slate-700">{application.notes ?? "No notes yet."}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Stored on the local filesystem with metadata in Prisma.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {application.documents.map((document: { id: string; originalFileName: string; fileSize: number; uploadedAt: Date; tags: string }) => (
                      <TableRow key={document.id} className="hover:bg-slate-50/40 transition-colors">
                        <TableCell className="font-medium text-slate-800">
                          <div className="flex flex-col gap-1.5">
                            <a
                              href={`/api/documents/${document.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-500 hover:underline"
                            >
                              <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                              <span className="font-semibold text-slate-800 break-all">{document.originalFileName}</span>
                            </a>
                            {document.tags ? (
                              <div className="flex flex-wrap gap-1.5 pl-6">
                                {document.tags.split(",").map((tag) => (
                                  <Badge key={tag} className="bg-blue-50 text-blue-700 ring-1 ring-blue-700/10 text-[10px] px-2 py-0.5 font-medium rounded-full">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">{Math.round(document.fileSize / 1024)} KB</TableCell>
                        <TableCell className="text-slate-600">{formatDate(document.uploadedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/api/documents/${document.id}?download=true`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              title="Download document"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <DeleteDocumentButton documentId={document.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {application.documents.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-400">No documents uploaded.</TableCell></TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Long-form notes added over the life of the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {application.applicationNotes.map((note: { id: string; content: string; createdAt: Date }) => (
                <div key={note.id} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>{formatDate(note.createdAt)}</span>
                    <Badge className="bg-blue-100 text-blue-700">Note</Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{note.content}</p>
                </div>
              ))}
              {application.applicationNotes.length === 0 ? <p className="text-sm text-slate-500">No notes have been added yet.</p> : null}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <StatusTimeline
            applicationId={application.id}
            initialHistory={application.statusHistory}
            hasAppliedDate={!!application.appliedDate}
          />

          <Card>
            <CardHeader>
              <CardTitle>Upload document</CardTitle>
              <CardDescription>PDF, DOC, DOCX, TXT, image, zip, and video uploads up to 100 MB.</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUploadForm applicationId={application.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add note</CardTitle>
              <CardDescription>Capture interview prep, feedback, or reminders.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={handleAddNote} className="space-y-4">
                <input type="hidden" name="applicationId" value={application.id} />
                <Textarea name="content" placeholder="Add a note..." />
                <Button type="submit" className="w-full">Save note</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>


    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
