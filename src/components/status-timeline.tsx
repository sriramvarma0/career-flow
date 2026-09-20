"use client";

import { useState, useEffect } from "react";
import { Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { updateStatusHistoryAction, getCustomStatusesAction, createCustomStatusAction } from "@/actions/applications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { applicationStatuses, statusColors } from "@/types/jobvault";
import { formatDate } from "@/lib/utils";

type Stage = {
  id?: string;
  status: string;
  date: string;
};

type StatusTimelineProps = {
  applicationId: string;
  initialHistory: {
    id: string;
    newStatus: string;
    changedAt: Date | string | null;
  }[];
  hasAppliedDate?: boolean;
};

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function StatusTimeline({ applicationId, initialHistory, hasAppliedDate }: StatusTimelineProps) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [insertingIndex, setInsertingIndex] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<string>("Applied");
  const [newDate, setNewDate] = useState<string>("");
  const [noDateValue, setNoDateValue] = useState(false);

  const [customStatuses, setCustomStatuses] = useState<{ name: string; linkedStatus: string }[]>([]);
  const [showNewStatusModal, setShowNewStatusModal] = useState(false);
  const [newCustomStatusName, setNewCustomStatusName] = useState("");
  const [newStatusCategory, setNewStatusCategory] = useState("Applied");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  useEffect(() => {
    getCustomStatusesAction().then((res) => {
      if (res.ok && res.data) {
        setCustomStatuses(res.data);
      }
    });
  }, []);

  useEffect(() => {
    // Sort initial history by changedAt date
    const sorted = [...initialHistory].sort((a, b) => {
      const timeA = a.changedAt ? new Date(a.changedAt).getTime() : 0;
      const timeB = b.changedAt ? new Date(b.changedAt).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });
    setStages(
      sorted.map((item) => ({
        id: item.id,
        status: item.newStatus,
        date: item.changedAt ? new Date(item.changedAt).toISOString().slice(0, 10) : "",
      }))
    );
  }, [initialHistory]);

  const handleDeleteStage = async (indexToDelete: number) => {
    const stageToDelete = stages[indexToDelete];
    if (stageToDelete.status === "Applied" && hasAppliedDate) {
      toast.error("To remove the 'Applied' stage, you must clear the Applied Date in the application form details first.");
      return;
    }

    const updated = stages.filter((_, idx) => idx !== indexToDelete);
    const oldStages = [...stages];
    setStages(updated);
    
    toast.promise(
      updateStatusHistoryAction(applicationId, updated).then((res) => {
        if (!res.ok) {
          setStages(oldStages); // revert
          throw new Error(res.message || "Could not delete stage.");
        }
        return res;
      }),
      {
        loading: "Deleting stage...",
        success: (res) => res.message || "Stage deleted.",
        error: (err) => err.message
      }
    );
  };

  const startInserting = (index: number) => {
    setInsertingIndex(index);
    setNewStatus("Applied");
    setNewDate(getLocalDateString());
    setNoDateValue(false);
  };

  const handleConfirmInsert = async () => {
    if (insertingIndex === null) return;

    // Validate duplicate primary statuses
    const defaultStatuses = ["Applied", "Assessment", "Interview", "HRRound", "Offer", "Rejected", "Withdrawn"];
    if (defaultStatuses.includes(newStatus)) {
      const alreadyExists = stages.some((s) => s.status === newStatus);
      if (alreadyExists) {
        toast.error(`Primary status '${newStatus === "HRRound" ? "HR Round" : newStatus}' cannot be repeated in the timeline.`);
        return;
      }
    }

    const resolvedDate = noDateValue ? "" : (newDate || getLocalDateString());
    const newStage: Stage = {
      status: newStatus,
      date: resolvedDate,
    };
    const updated = [...stages];
    const oldStages = [...stages];
    updated.splice(insertingIndex, 0, newStage);
    setStages(updated);
    setInsertingIndex(null);

    toast.promise(
      updateStatusHistoryAction(applicationId, updated).then((res) => {
        if (!res.ok) {
          setStages(oldStages); // revert
          throw new Error(res.message || "Could not add stage.");
        }
        return res;
      }),
      {
        loading: "Adding stage...",
        success: (res) => res.message || "Stage added.",
        error: (err) => err.message
      }
    );
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardTitle>Status</CardTitle>
        <CardDescription>
          Timeline of application stages. Click delete to remove, or hover between stages to insert a new stage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pb-6">
        <div className="relative pl-2 pr-1 py-2 space-y-4">
          {stages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6">
              <div className="rounded-full bg-blue-50 p-3 text-blue-600 mb-3">
                <Plus className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-slate-800">No stages tracked yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
                Add timeline stages (e.g. Applied, Interview, Offer) to map your progression.
              </p>
              <button
                type="button"
                onClick={() => startInserting(0)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add First Stage</span>
              </button>
            </div>
          ) : (
            <>
              {/* Vertical Timeline Line */}
              {stages.length > 0 && (
                <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-200" />
              )}

              {stages.map((stage, index) => {
                const displayStatus = stage.status === "HRRound" ? "HR Round" : stage.status;
                return (
                  <div key={index} className="relative flex flex-col">
                    {/* Node Container */}
                    <div className="flex items-center gap-4">
                      {/* Circle Node Indicator */}
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 border border-blue-200 text-blue-600 font-semibold text-xs shadow-xs">
                        {index + 1}
                      </div>

                      {/* Stage Card */}
                      <div className="relative group/node flex-1 flex items-center justify-between p-3 rounded-2xl border border-blue-100 bg-blue-50/20 hover:bg-blue-50/50 hover:border-blue-200 transition-all shadow-xs">
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const customDef = customStatuses.find((c) => c.name === stage.status);
                              if (customDef) {
                                const linkedLabel = customDef.linkedStatus === "HRRound" ? "HR Round" : customDef.linkedStatus;
                                const colorClass = statusColors[customDef.linkedStatus] || "bg-slate-50 text-slate-700 ring-1 ring-slate-700/10";
                                return (
                                  <>
                                    <span className="text-xs font-semibold text-slate-800">{displayStatus}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${colorClass}`}>
                                      {linkedLabel}
                                    </span>
                                  </>
                                );
                              } else {
                                const isPrimary = applicationStatuses.includes(stage.status as any);
                                if (isPrimary) {
                                  const displayLabel = stage.status === "HRRound" ? "HR Round" : stage.status;
                                  const colorClass = statusColors[stage.status as any] || "bg-slate-50 text-slate-700 ring-1 ring-slate-700/10";
                                  return (
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${colorClass}`}>
                                      {displayLabel}
                                    </span>
                                  );
                                }
                              }
                              return <span className="text-xs font-semibold text-slate-800">{displayStatus}</span>;
                            })()}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">{stage.date ? formatDate(stage.date) : "No date"}</span>
                        </div>

                        {/* Delete button (bin like document deletion workflow, minimal red on hover) */}
                        <button
                          type="button"
                          onClick={() => handleDeleteStage(index)}
                          className="opacity-0 group-hover/node:opacity-100 h-7 w-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center shadow-xs transition-all shrink-0"
                          title="Delete stage"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Connector with Hover Plus Icon (between this node and next node) */}
                    {index < stages.length - 1 && (
                      <div className="group/line relative h-4 flex items-center justify-start">
                        {/* Hover Plus Icon */}
                        <button
                          type="button"
                          onClick={() => startInserting(index + 1)}
                          className="absolute left-[11px] z-20 opacity-0 group-hover/line:opacity-100 h-5 w-5 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-sm transform scale-75 group-hover/line:scale-100"
                          title="Insert stage here"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Plus icon at the end of the line */}
              <div className="flex items-center gap-4 pl-0.5">
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                </div>
                <button
                  type="button"
                  onClick={() => startInserting(stages.length)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-slate-300 hover:border-blue-500 text-[11px] font-medium text-slate-500 hover:text-blue-600 transition-colors bg-white shadow-xs"
                  title="Add stage at the end"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Stage</span>
                </button>
              </div>
            </>
          )}
        </div>
      </CardContent>

      {/* Insert Stage Popup Dialog */}
      {insertingIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-80 rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <h3 className="text-sm font-semibold text-slate-900">Add Stage</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                <Select
                  value={newStatus}
                  onChange={(e) => {
                    if (e.target.value === "add-new") {
                      setShowNewStatusModal(true);
                    } else {
                      setNewStatus(e.target.value);
                    }
                  }}
                >
                  {applicationStatuses.map((status) => (
                    <option key={status} value={status}>{status === "HRRound" ? "HR Round" : status}</option>
                  ))}
                  {customStatuses.map((status) => (
                    <option key={status.name} value={status.name}>{status.name}</option>
                  ))}
                  <option value="add-new">+ Add new...</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  disabled={noDateValue}
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="no-date-checkbox"
                  checked={noDateValue}
                  onChange={(e) => setNoDateValue(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="no-date-checkbox" className="text-xs text-slate-600 cursor-pointer select-none">
                  Date not available
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setInsertingIndex(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmInsert}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {showNewStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-80 rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <h3 className="text-sm font-semibold text-slate-900">Add Custom Status</h3>
            <p className="text-xs text-slate-500">
              Create a new status for your application stages.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status Name</label>
                <Input
                  placeholder="e.g. Technical Round"
                  value={newCustomStatusName}
                  onChange={(e) => setNewCustomStatusName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Primary Category</label>
                <Select
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
                  setNewCustomStatusName("");
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
                  const trimmed = newCustomStatusName.trim();
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
                    setNewStatus(savedStatus.name);
                    setShowNewStatusModal(false);
                    setNewCustomStatusName("");
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
