import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  Link2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  GitMerge,
  Check,
  X,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminPageMeta } from "@/lib/seo-helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  approveCrmPersonGroup,
  fetchCrmConfig,
  fetchCrmPeople,
  mergeCrmPersonGroup,
  restoreCrmClient,
  resolveCrmTransfer,
  startCrmTransfer,
} from "@/store/slices/crmSlice";
import { fetchBrokers } from "@/store/slices/brokersSlice";
import { isAdminRole } from "@shared/api";
import { getSharedAblyClient } from "@/lib/ably-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft } from "lucide-react";

const CrmPeople = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const {
    peopleGroups,
    isLoadingPeople,
    peoplePagination,
    perOwnerCrmActive,
    isLoadingConfig,
  } = useAppSelector((s) => s.crm);
  const user = useAppSelector((s) => s.brokerAuth.user);
  const sessionToken = useAppSelector((s) => s.brokerAuth.sessionToken);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [transferClientId, setTransferClientId] = useState<number | null>(null);
  const [transferToBrokerId, setTransferToBrokerId] = useState<string>("");
  const [transferJobId, setTransferJobId] = useState<number | null>(null);
  const [transferConflicts, setTransferConflicts] = useState<
    Array<{ field: string; source_value: string; target_value: string }>
  >([]);
  const [transferResolution, setTransferResolution] = useState<string>(
    "merge_fields",
  );
  const brokers = useAppSelector((s) => s.brokers.brokers);

  const isAdmin = isAdminRole(user?.role ?? "");

  const refreshPeople = () => {
    dispatch(fetchCrmPeople({ search: search || undefined }));
  };

  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchCrmConfig());
      dispatch(fetchBrokers());
    }
  }, [dispatch, isAdmin]);

  useEffect(() => {
    if (isAdmin && perOwnerCrmActive) {
      dispatch(fetchCrmPeople({ search: search || undefined }));
    }
  }, [dispatch, isAdmin, perOwnerCrmActive, search]);

  // Live refresh when another admin completes a CRM transfer affecting this broker.
  useEffect(() => {
    if (!isAdmin || !sessionToken || !user?.id || !perOwnerCrmActive) return;
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const client = await getSharedAblyClient(sessionToken);
      if (cancelled || !client) return;
      const ch = client.channels.get(`broker-notifications:${user.id}`);
      const onUpdate = () => {
        toast({ title: "CRM updated", description: "Refreshing people list." });
        refreshPeople();
      };
      ch.subscribe("crm-updated", onUpdate);
      cleanup = () => {
        try {
          ch.unsubscribe("crm-updated", onUpdate);
        } catch {
          /* noop */
        }
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshPeople closes over search
  }, [dispatch, isAdmin, sessionToken, user?.id, perOwnerCrmActive, search, toast]);

  const handleRestore = async (clientId: number) => {
    setBusyKey(`restore-${clientId}`);
    try {
      await dispatch(restoreCrmClient(clientId)).unwrap();
      toast({ title: "Client restored to active list" });
      refreshPeople();
    } catch (err: unknown) {
      toast({
        title: "Restore failed",
        description: String(err || "Try again"),
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleApproveLink = async (groupId: number, approve: boolean) => {
    setBusyKey(`approve-${groupId}-${approve}`);
    try {
      await dispatch(approveCrmPersonGroup({ groupId, approve })).unwrap();
      toast({ title: approve ? "Link approved" : "Link rejected" });
      refreshPeople();
    } catch (err: unknown) {
      toast({
        title: "Could not update link",
        description: String(err || "Try again"),
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };


  const handleStartTransfer = async () => {
    if (!transferClientId || !transferToBrokerId) return;
    setBusyKey(`transfer-${transferClientId}`);
    try {
      const result = await dispatch(
        startCrmTransfer({
          to_broker_id: Number(transferToBrokerId),
          source_entity_id: transferClientId,
        }),
      ).unwrap();
      if (result.job?.status === "review" || (result.conflicts?.length ?? 0) > 0) {
        setTransferJobId(result.job!.id);
        setTransferConflicts(result.conflicts || []);
        toast({
          title: "Transfer needs review",
          description: "Choose how to resolve the phone conflict.",
        });
      } else if (result.job) {
        await dispatch(
          resolveCrmTransfer({
            jobId: result.job.id,
            resolution: "merge_fields",
          }),
        ).unwrap();
        toast({ title: "Client transferred" });
        setTransferClientId(null);
        setTransferToBrokerId("");
        refreshPeople();
      }
    } catch (err: unknown) {
      toast({
        title: "Transfer failed",
        description: String(err || "Try again"),
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleResolveTransfer = async () => {
    if (!transferJobId) return;
    setBusyKey(`resolve-${transferJobId}`);
    try {
      await dispatch(
        resolveCrmTransfer({
          jobId: transferJobId,
          resolution: transferResolution as
            | "keep_target_name"
            | "replace_with_source"
            | "merge_fields"
            | "duplicate_import_name"
            | "rename_on_import",
        }),
      ).unwrap();
      toast({ title: "Transfer completed" });
      setTransferClientId(null);
      setTransferJobId(null);
      setTransferConflicts([]);
      setTransferToBrokerId("");
      refreshPeople();
    } catch (err: unknown) {
      toast({
        title: "Could not resolve transfer",
        description: String(err || "Try again"),
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleMerge = async (groupId: number, survivorClientId: number) => {
    setBusyKey(`merge-${groupId}-${survivorClientId}`);
    try {
      await dispatch(
        mergeCrmPersonGroup({
          groupId,
          survivor_client_id: survivorClientId,
        }),
      ).unwrap();
      toast({
        title: "Records merged",
        description: `Survivor #${survivorClientId}`,
      });
      refreshPeople();
    } catch (err: unknown) {
      toast({
        title: "Merge failed",
        description: String(err || "Try again"),
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-muted-foreground">
        Admin access is required for the People view.
      </div>
    );
  }

  if (isLoadingConfig) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
      </div>
    );
  }

  if (!perOwnerCrmActive) {
    return (
      <div className="p-6 text-muted-foreground">
        Per-owner CRM is not enabled. Set{" "}
        <code className="text-sm">PER_OWNER_CRM_ENABLED=1</code> and redeploy.
      </div>
    );
  }

  const totalPeoplePages = peoplePagination
    ? Math.max(1, Math.ceil(peoplePagination.total / peoplePagination.limit))
    : 1;

  return (
    <>
      <MetaHelmet {...adminPageMeta("CRM People", "Phone-grouped CRM view")} />
      <div className="flex flex-col h-full min-h-0 gap-4 p-4 md:p-6">
        <PageHeader
          title="People"
          description="Same phone number across mortgage bankers — approve links, restore hidden rows, or merge"
          icon={<Users className="h-7 w-7 text-primary" />}
        />

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by phone or digits…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoadingPeople ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" />
          </div>
        ) : peopleGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No phone groups found. Duplicate phones appear here once per-owner
              CRM is enabled and bankers save the same number.
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-3 pb-8">
              {peopleGroups.map((group) => {
                const key = group.normalized_phone;
                const isOpen = expanded[key] ?? group.member_count <= 3;
                const pendingGroupId = group.members.find(
                  (m) => m.link_group_status === "pending" && m.link_group_id,
                )?.link_group_id;
                const linkedGroupId = group.members.find(
                  (m) => m.link_group_status === "linked" && m.link_group_id,
                )?.link_group_id;
                return (
                  <Card key={key} className="overflow-hidden">
                    <CardHeader
                      className="py-3 px-4 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() =>
                        setExpanded((p) => ({ ...p, [key]: !isOpen }))
                      }
                    >
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                        <CardTitle className="text-base font-semibold flex-1">
                          {group.display_phone || group.normalized_phone}
                        </CardTitle>
                        <Badge variant="secondary">
                          {group.member_count} row
                          {group.member_count !== 1 ? "s" : ""}
                        </Badge>
                        {group.members.some((m) => m.link_group_id) && (
                          <Badge className="bg-primary/10 text-primary border-0">
                            <Link2 className="h-3 w-3 mr-1" />
                            Linked
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    {isOpen && (
                      <CardContent className="px-4 pb-4 pt-0 space-y-3">
                        {pendingGroupId != null && (
                          <div className="flex flex-wrap gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                            <p className="text-xs text-amber-800 flex-1 min-w-[12rem]">
                              Pending identity link #{pendingGroupId}
                            </p>
                            <Button
                              size="sm"
                              className="gap-1"
                              disabled={busyKey != null}
                              onClick={() =>
                                handleApproveLink(pendingGroupId, true)
                              }
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              disabled={busyKey != null}
                              onClick={() =>
                                handleApproveLink(pendingGroupId, false)
                              }
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        )}
                        <ul className="divide-y rounded-lg border">
                          {group.members.map((m) => (
                            <li
                              key={m.client_id}
                              className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm"
                            >
                              <span className="font-medium">
                                {m.first_name} {m.last_name}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                #{m.client_id}
                              </span>
                              {m.assigned_broker_name && (
                                <Badge variant="outline" className="text-xs">
                                  {m.assigned_broker_name}
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  m.list_visibility !== "active" &&
                                    "text-amber-600 border-amber-300",
                                )}
                              >
                                {m.list_visibility}
                              </Badge>
                              <div className="flex flex-wrap gap-1 ml-auto">
                                {m.list_visibility !== "active" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 gap-1 text-xs"
                                    disabled={busyKey != null}
                                    onClick={() => handleRestore(m.client_id)}
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    Restore
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs"
                                  disabled={busyKey != null}
                                  onClick={() => {
                                    setTransferClientId(m.client_id);
                                    setTransferJobId(null);
                                    setTransferConflicts([]);
                                    setTransferToBrokerId("");
                                  }}
                                >
                                  <ArrowRightLeft className="h-3 w-3" />
                                  Transfer
                                </Button>
                                {linkedGroupId != null &&
                                  m.link_group_id === linkedGroupId &&
                                  group.member_count > 1 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 gap-1 text-xs"
                                      disabled={busyKey != null}
                                      onClick={() =>
                                        handleMerge(linkedGroupId, m.client_id)
                                      }
                                    >
                                      <GitMerge className="h-3 w-3" />
                                      Merge into this
                                    </Button>
                                  )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {peoplePagination && totalPeoplePages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={peoplePagination.page <= 1}
              onClick={() =>
                dispatch(
                  fetchCrmPeople({
                    page: peoplePagination.page - 1,
                    search: search || undefined,
                  }),
                )
              }
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground self-center">
              Page {peoplePagination.page} of {totalPeoplePages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={peoplePagination.page >= totalPeoplePages}
              onClick={() =>
                dispatch(
                  fetchCrmPeople({
                    page: peoplePagination.page + 1,
                    search: search || undefined,
                  }),
                )
              }
            >
              Next
            </Button>
          </div>
        )}
      </div>
    
      <Dialog
        open={transferClientId != null}
        onOpenChange={(open) => {
          if (!open) {
            setTransferClientId(null);
            setTransferJobId(null);
            setTransferConflicts([]);
            setTransferToBrokerId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transferJobId ? "Resolve transfer conflict" : "Transfer client"}
            </DialogTitle>
          </DialogHeader>
          {!transferJobId ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Move client #{transferClientId} to another broker&apos;s list.
              </p>
              <Select
                value={transferToBrokerId}
                onValueChange={setTransferToBrokerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target broker" />
                </SelectTrigger>
                <SelectContent>
                  {brokers
                    .filter((b) => b.id !== user?.id)
                    .map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.first_name} {b.last_name} (#{b.id})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3">
              {transferConflicts.map((c, i) => (
                <p key={i} className="text-sm text-amber-700">
                  {c.field}: {c.source_value} → {c.target_value}
                </p>
              ))}
              <Select
                value={transferResolution}
                onValueChange={setTransferResolution}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge_fields">Merge fields / reassign</SelectItem>
                  <SelectItem value="keep_target_name">Keep target, hide source</SelectItem>
                  <SelectItem value="replace_with_source">Replace target with source</SelectItem>
                  <SelectItem value="duplicate_import_name">Keep both (hide source)</SelectItem>
                  <SelectItem value="rename_on_import">Rename on import / reassign</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTransferClientId(null);
                setTransferJobId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={busyKey != null || (!transferJobId && !transferToBrokerId)}
              onClick={() =>
                transferJobId ? handleResolveTransfer() : handleStartTransfer()
              }
            >
              {transferJobId ? "Resolve" : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
</>
  );
};

export default CrmPeople;
