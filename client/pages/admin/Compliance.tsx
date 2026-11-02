import React, { useEffect, useState } from "react";
import {
  Shield,
  Loader2,
  CheckCircle2,
  Circle,
  ChevronRight,
  Plus,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminPageMeta } from "@/lib/seo-helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearComplianceSelection,
  createDefaultComplianceChecklist,
  fetchComplianceChecklist,
  fetchComplianceChecklists,
  toggleComplianceItem,
} from "@/store/slices/complianceSlice";
import { fetchLoans } from "@/store/slices/pipelineSlice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const Compliance = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { checklists, selected, isLoading, isSaving } = useAppSelector(
    (s) => s.compliance,
  );
  const loans = useAppSelector((s) => s.pipeline.loans);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");

  useEffect(() => {
    dispatch(fetchComplianceChecklists());
  }, [dispatch]);

  useEffect(() => {
    if (createOpen) {
      dispatch(fetchLoans({}));
    }
  }, [createOpen, dispatch]);

  const handleCreate = async () => {
    const applicationId = Number(selectedLoanId);
    if (!Number.isFinite(applicationId)) return;
    try {
      await dispatch(createDefaultComplianceChecklist(applicationId)).unwrap();
      setCreateOpen(false);
      setSelectedLoanId("");
      toast({ title: "Checklist created" });
    } catch (err: unknown) {
      toast({
        title: "Could not create checklist",
        description: String(err || "Try again"),
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Compliance",
          "Compliance checklists and regulatory tracking",
        )}
      />
      <div className="flex flex-col h-full min-h-0 gap-4 p-4 md:p-6">
        <PageHeader
          title="Compliance Management"
          description="Track per-loan compliance checklists and mark required items complete."
          icon={<Shield className="h-5 w-5" />}
          actions={
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New checklist
            </Button>
          }
        />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 min-h-0 flex-1">
          <Card className="min-h-0 flex flex-col">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Checklists</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              {isLoading && checklists.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : checklists.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No compliance checklists yet. Create one for a loan
                  application.
                </p>
              ) : (
                <ScrollArea className="h-[min(60vh,520px)]">
                  <ul className="divide-y">
                    {checklists.map((c) => {
                      const pct =
                        c.item_count > 0
                          ? Math.round(
                              (c.completed_item_count / c.item_count) * 100,
                            )
                          : 0;
                      const active = selected?.id === c.id;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            className={cn(
                              "w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-start gap-3",
                              active && "bg-muted/60",
                            )}
                            onClick={() =>
                              dispatch(fetchComplianceChecklist(c.id))
                            }
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <p className="font-medium text-sm truncate">
                                  {c.checklist_name}
                                </p>
                                {c.is_completed ? (
                                  <Badge className="bg-emerald-600 text-white border-0 text-xs">
                                    Complete
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    {pct}%
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {c.application_number || `Loan #${c.application_id}`}
                                {c.client_name ? ` · ${c.client_name}` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {c.completed_item_count}/{c.item_count} items
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="min-h-0 flex flex-col">
            <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {selected ? selected.checklist_name : "Checklist detail"}
              </CardTitle>
              {selected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch(clearComplianceSelection())}
                >
                  Close
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              {!selected ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Select a checklist to review and complete items.
                </p>
              ) : (
                <ScrollArea className="h-[min(60vh,520px)] pr-3">
                  <div className="space-y-3 pb-4">
                    <p className="text-sm text-muted-foreground">
                      {selected.application_number ||
                        `Loan #${selected.application_id}`}
                      {selected.client_name ? ` · ${selected.client_name}` : ""}
                    </p>
                    {selected.items.map((item) => (
                      <label
                        key={item.id}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors",
                          item.is_completed && "bg-emerald-50/50 border-emerald-200",
                        )}
                      >
                        <Checkbox
                          checked={item.is_completed}
                          disabled={isSaving}
                          onCheckedChange={(checked) =>
                            dispatch(
                              toggleComplianceItem({
                                checklistId: selected.id,
                                itemId: item.id,
                                is_completed: Boolean(checked),
                              }),
                            )
                          }
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{item.item_name}</p>
                            {item.is_required && (
                              <Badge variant="outline" className="text-[10px]">
                                Required
                              </Badge>
                            )}
                            {item.is_completed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          {item.item_description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.item_description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New compliance checklist</DialogTitle>
            <DialogDescription>
              Creates a standard TRID / disclosure checklist for the selected
              loan application.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
            <SelectTrigger>
              <SelectValue placeholder="Select loan application" />
            </SelectTrigger>
            <SelectContent>
              {(loans || []).map((loan: any) => (
                <SelectItem key={loan.id} value={String(loan.id)}>
                  {loan.application_number || `#${loan.id}`}
                  {loan.client_name ? ` — ${loan.client_name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedLoanId}
              onClick={handleCreate}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Compliance;
