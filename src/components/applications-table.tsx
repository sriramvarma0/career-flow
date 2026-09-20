"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { type ApplicationFilters, type ApplicationStatus, applicationStatuses } from "@/types/jobvault";
import { getCustomStatusesAction } from "@/actions/applications";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type ApplicationRow = {
  id: string;
  companyName: string;
  jobTitle: string;
  status: ApplicationStatus;
  appliedDate: Date | null;
  source: string;
  appliedPlatform?: string | null;
  salary?: string | null;
  location?: string | null;
  statusDate?: Date | null;
};

type ApplicationsTableProps = {
  applications: ApplicationRow[];
  total?: number;
  page?: number;
  totalPages?: number;
  filters?: ApplicationFilters;
  showControls?: boolean;
};

export function ApplicationsTable({ applications, total, page, totalPages, filters, showControls = true }: ApplicationsTableProps) {
  const router = useRouter();
  const [customStatuses, setCustomStatuses] = useState<{ name: string; linkedStatus: string }[]>([]);

  useEffect(() => {
    getCustomStatusesAction().then((res) => {
      if (res.ok && res.data) {
        setCustomStatuses(res.data);
      }
    });
  }, []);

  const statusMap = new Map<string, string>();
  customStatuses.forEach((cs) => {
    statusMap.set(cs.name, cs.linkedStatus);
  });
  const [showFilters, setShowFilters] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasActiveFilters = Boolean(
    (filters?.query && filters.query.trim()) ||
    (filters?.status && filters.status !== "all") ||
    (filters?.source && filters.source !== "all") ||
    (filters?.sort && filters.sort !== "newest") ||
    filters?.from ||
    filters?.to
  );

  const handleFilterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();

    const queryVal = formData.get("query")?.toString().trim();
    const statusVal = formData.get("status")?.toString();
    const sourceVal = formData.get("source")?.toString();
    const sortVal = formData.get("sort")?.toString();
    const fromVal = formData.get("from")?.toString();
    const toVal = formData.get("to")?.toString();

    if (queryVal) params.set("query", queryVal);
    if (statusVal && statusVal !== "all") params.set("status", statusVal);
    if (sourceVal && sourceVal !== "all") params.set("source", sourceVal);
    if (sortVal && sortVal !== "newest") params.set("sort", sortVal);
    if (fromVal) params.set("from", fromVal);
    if (toVal) params.set("to", toVal);

    params.set("page", "1");

    setShowFilters(false);
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(newPage));
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-5">
      <Card>
        {showControls && (
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-100 px-6 py-4">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-800">Job Applications</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Track your active pipeline applications ({total ?? applications.length} records)
              </CardDescription>
            </div>
            <div className="relative" ref={dropdownRef}>
              <Button
                type="button"
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-9 gap-2 rounded-full border-slate-200"
              >
                <Filter className="h-4 w-4 text-slate-500" />
                <span>Filter</span>
                {hasActiveFilters && (
                  <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
                )}
              </Button>

              {/* Floating Filter Popover */}
              {showFilters && (
                <div className="absolute right-0 top-11 z-30 w-80 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-sm font-semibold text-slate-800">Filters</span>
                    <button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <form className="space-y-4 text-left" onSubmit={handleFilterSubmit}>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search</label>
                      <Input
                        name="query"
                        placeholder="Company or title..."
                        defaultValue={filters?.query}
                        className="h-10 text-sm bg-slate-50 border-slate-200 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                      <Select name="status" defaultValue={filters?.status ?? "all"} className="h-10 text-sm bg-slate-50 border-slate-200 focus:bg-white">
                        <option value="all">All statuses</option>
                        {applicationStatuses.map((status) => (
                          <option key={status} value={status}>{status === "HRRound" ? "HR Round" : status}</option>
                        ))}
                         {customStatuses.map((status) => (
                          <option key={status.name} value={status.name}>{status.name}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</label>
                      <Select name="source" defaultValue={filters?.source ?? "all"} className="h-10 text-sm bg-slate-50 border-slate-200 focus:bg-white">
                        <option value="all">All sources</option>
                        <option value="CompanyWebsite">Company Website</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Referral">Referral</option>
                        <option value="Recruiter">Recruiter</option>
                        <option value="JobBoard">Job Board</option>
                        <option value="College">College</option>
                        <option value="Other">Other</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sort By</label>
                      <Select name="sort" defaultValue={filters?.sort ?? "appliedDateNewest"} className="h-10 text-sm bg-slate-50 border-slate-200 focus:bg-white">
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="appliedDateNewest">Applied Date (Newest)</option>
                        <option value="appliedDateOldest">Applied Date (Oldest)</option>
                        <option value="company">Company (A-Z)</option>
                        <option value="status">Status</option>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From Date</label>
                        <Input
                          type="date"
                          name="from"
                          defaultValue={filters?.from}
                          className="h-10 text-sm bg-slate-50 border-slate-200 focus:bg-white px-2"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To Date</label>
                        <Input
                          type="date"
                          name="to"
                          defaultValue={filters?.to}
                          className="h-10 text-sm bg-slate-50 border-slate-200 focus:bg-white px-2"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <Link
                        href="/applications"
                        className="text-xs font-medium text-slate-500 hover:text-blue-600"
                        onClick={() => setShowFilters(false)}
                      >
                        Clear all
                      </Link>
                      <Button type="submit" size="sm" className="h-9 px-4 rounded-full">
                        Apply
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </CardHeader>
        )}
        <CardContent className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 py-2.5">Company</TableHead>
                  <TableHead className="px-2 py-2.5">Position</TableHead>
                  <TableHead className="px-2 py-2.5">Location</TableHead>
                  <TableHead className="px-2 py-2.5">Salary</TableHead>
                  <TableHead className="px-2 py-2.5">Applied Date</TableHead>
                  <TableHead className="px-2 py-2.5">Applied Platform</TableHead>
                  <TableHead className="px-2 py-2.5">Status</TableHead>
                  <TableHead className="px-2 py-2.5">Status Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow
                    key={application.id}
                    className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                    onClick={() => router.push(`/applications/${application.id}`)}
                  >
                    <TableCell className="px-2 py-3.5 font-medium text-slate-900">{application.companyName}</TableCell>
                    <TableCell className="px-2 py-3.5">{application.jobTitle}</TableCell>
                    <TableCell className="px-2 py-3.5 text-slate-600">{application.location || "-"}</TableCell>
                    <TableCell className="px-2 py-3.5 text-slate-600">{application.salary || "-"}</TableCell>
                    <TableCell className="px-2 py-3.5">{formatDate(application.appliedDate)}</TableCell>
                    <TableCell className="px-2 py-3.5 text-slate-600">{application.appliedPlatform || "-"}</TableCell>
                    <TableCell className="px-2 py-3.5"><StatusPill status={application.status} category={statusMap.get(application.status)} /></TableCell>
                    <TableCell className="px-2 py-3.5">{formatDate(application.statusDate)}</TableCell>
                  </TableRow>
                ))}
                {applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center text-slate-500">
                      No applications match the current filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {typeof total === "number" && typeof page === "number" && typeof totalPages === "number" && totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
          <span>Total records: {total}</span>
          <div className="flex items-center gap-3">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={page <= 1}
                className="h-9 w-9 px-0"
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={page >= totalPages}
                className="h-9 w-9 px-0"
                onClick={() => handlePageChange(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
