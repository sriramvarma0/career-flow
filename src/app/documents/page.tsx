import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listDocumentsForUser } from "@/repositories/document-repository";
import { AppShell } from "@/components/app-shell";
import { DocumentsAccordion } from "@/components/documents-accordion";
import { FileText, HardDrive, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DocumentsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const applications = await listDocumentsForUser(session.user.id);

  // Calculate statistics for the dynamic banner
  const totalDocs = applications.reduce((sum, app) => sum + app.documents.length, 0);
  const totalSizeBytes = applications.reduce(
    (sum, app) => sum + app.documents.reduce((s, doc) => s + doc.fileSize, 0),
    0
  );

  let formattedSize = "0 KB";
  if (totalSizeBytes > 1024 * 1024) {
    formattedSize = `${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  } else if (totalSizeBytes > 0) {
    formattedSize = `${Math.round(totalSizeBytes / 1024)} KB`;
  }

  const tagCounts: Record<string, number> = {};
  applications.forEach((app) => {
    app.documents.forEach((doc) => {
      if (doc.tags) {
        doc.tags.split(",").forEach((t) => {
          const cleaned = t.trim();
          if (cleaned) {
            tagCounts[cleaned] = (tagCounts[cleaned] || 0) + 1;
          }
        });
      }
    });
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  return (
    <AppShell
      title="Documents Vault"
      subtitle="Organize, manage, and download resumes, cover letters, and references across all your job applications."
    >
      <div className="space-y-6">
        {/* Dynamic Statistics Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="overflow-hidden border border-blue-100 bg-white shadow-sm transition hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Documents</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalDocs}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-blue-100 bg-white shadow-sm transition hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <HardDrive className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Storage Used</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{formattedSize}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-blue-100 bg-white shadow-sm transition hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Tag className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Popular Tags</p>
                <div className="flex flex-wrap gap-1 mt-1.5 min-h-[24px]">
                  {topTags.length > 0 ? (
                    topTags.map((tag) => (
                      <Badge
                        key={tag}
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none text-[9px] font-bold px-1.5 py-0.5"
                      >
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">No tags added yet</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Client Accordion Component */}
        <DocumentsAccordion applications={applications} />
      </div>
    </AppShell>
  );
}
