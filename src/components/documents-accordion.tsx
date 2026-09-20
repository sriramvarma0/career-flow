"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  FileText,
  Download,
  FolderOpen,
  Search,
  ExternalLink,
  BriefcaseBusiness,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteDocumentButton } from "@/components/delete-buttons";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { StatusPill } from "@/components/status-pill";
import { formatDate } from "@/lib/utils";

type Document = {
  id: string;
  applicationId: string;
  fileName: string;
  originalFileName: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  tags: string;
  uploadedAt: Date;
};

type Application = {
  id: string;
  companyName: string;
  jobTitle: string;
  status: string;
  documents: Document[];
};

type DocumentsAccordionProps = {
  applications: Application[];
};

export function DocumentsAccordion({ applications }: DocumentsAccordionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const updated: Record<string, boolean> = {};
    filteredApplications.forEach((app) => {
      updated[app.id] = true;
    });
    setExpandedIds(updated);
  };

  const collapseAll = () => {
    setExpandedIds({});
  };

  // Client side filtering for applications & documents
  const filteredApplications = applications.filter((app) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const matchesApp =
      app.companyName.toLowerCase().includes(query) ||
      app.jobTitle.toLowerCase().includes(query) ||
      app.status.toLowerCase().includes(query);

    const matchesDocs = app.documents.some(
      (doc) =>
        doc.originalFileName.toLowerCase().includes(query) ||
        doc.tags.toLowerCase().includes(query)
    );

    return matchesApp || matchesDocs;
  });

  if (applications.length === 0) {
    return (
      <Card className="border border-dashed border-slate-300 bg-white/50 py-16 text-center">
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
            <FolderOpen className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold text-slate-800">No applications created yet</p>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              You need to log at least one application before you can upload and organize resumes or job description files.
            </p>
          </div>
          <Link href="/applications/new">
            <Button className="bg-blue-600 hover:bg-blue-500 rounded-full px-6 shadow-sm shadow-blue-200">
              Create your first application
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, job, file name, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="rounded-full border-slate-200 text-xs font-semibold text-slate-600"
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
            className="rounded-full border-slate-200 text-xs font-semibold text-slate-600"
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Main applications and documents table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="w-10"></TableHead>
                <TableHead className="font-semibold text-slate-500 text-xs">Company</TableHead>
                <TableHead className="font-semibold text-slate-500 text-xs">Job Title</TableHead>
                <TableHead className="font-semibold text-slate-500 text-xs">Status</TableHead>
                <TableHead className="font-semibold text-slate-500 text-xs">Documents</TableHead>
                <TableHead className="text-right font-semibold text-slate-500 text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.map((app) => {
                const isExpanded = !!expandedIds[app.id];
                const docCount = app.documents.length;

                return (
                  <React.Fragment key={app.id}>
                    {/* Parent row for application info */}
                    <TableRow
                      className="hover:bg-slate-50/30 transition-colors cursor-pointer"
                      onClick={() => toggleRow(app.id)}
                    >
                      <TableCell className="py-4">
                        <div
                          className={`grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-transform duration-300 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 py-4">
                        <div className="flex items-center gap-2.5">
                          <BriefcaseBusiness className="h-4 w-4 text-blue-500 shrink-0" />
                          <span>{app.companyName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 py-4">{app.jobTitle}</TableCell>
                      <TableCell className="py-4">
                        <StatusPill status={app.status as any} />
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="bg-blue-50 text-blue-700 border-none font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                          {docCount} {docCount === 1 ? "document" : "documents"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-4" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/applications/${app.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-500 hover:underline"
                        >
                          <span>Details</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>

                    {/* Collapsible details row */}
                    {isExpanded && (
                      <TableRow className="bg-slate-50/30 hover:bg-slate-50/30">
                        <TableCell colSpan={6} className="p-6 border-t-0">
                          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] items-start animate-in slide-in-from-top-1 duration-200">
                            
                            {/* Inner Documents Table */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Attached files</h4>
                              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-slate-50/50">
                                      <TableHead className="font-semibold text-slate-500 text-xs">File</TableHead>
                                      <TableHead className="font-semibold text-slate-500 text-xs">Size</TableHead>
                                      <TableHead className="font-semibold text-slate-500 text-xs">Uploaded</TableHead>
                                      <TableHead className="text-right font-semibold text-slate-500 text-xs">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {app.documents.map((doc) => (
                                      <TableRow
                                        key={doc.id}
                                        className="hover:bg-slate-50/30 transition-colors"
                                      >
                                        <TableCell className="font-medium text-slate-800 min-w-[200px]">
                                          <div className="flex flex-col gap-1.5">
                                            <a
                                              href={`/api/documents/${doc.id}`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-500 hover:underline"
                                            >
                                              <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                              <span className="font-semibold text-slate-800 break-all">
                                                {doc.originalFileName}
                                              </span>
                                            </a>
                                            {doc.tags ? (
                                              <div className="flex flex-wrap gap-1 pl-6">
                                                {doc.tags.split(",").map((tag) => (
                                                  <Badge
                                                    key={tag}
                                                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                                  >
                                                    {tag.trim()}
                                                  </Badge>
                                                ))}
                                              </div>
                                            ) : null}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-slate-600 text-xs whitespace-nowrap">
                                          {Math.round(doc.fileSize / 1024)} KB
                                        </TableCell>
                                        <TableCell className="text-slate-600 text-xs whitespace-nowrap">
                                          {formatDate(doc.uploadedAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            <a
                                              href={`/api/documents/${doc.id}?download=true`}
                                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                              title="Download document"
                                            >
                                              <Download className="h-4 w-4" />
                                            </a>
                                            <DeleteDocumentButton documentId={doc.id} />
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    {docCount === 0 ? (
                                      <TableRow>
                                        <TableCell
                                          colSpan={4}
                                          className="py-10 text-center text-slate-400 text-xs font-medium"
                                        >
                                          No documents attached. Use the upload panel to attach files.
                                        </TableCell>
                                      </TableRow>
                                    ) : null}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            {/* Upload Panel */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Upload documents</h4>
                              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                <DocumentUploadForm applicationId={app.id} />
                              </div>
                            </div>

                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-slate-400 text-sm font-medium"
                  >
                    No applications match your search.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
