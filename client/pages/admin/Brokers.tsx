import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchBrokers,
  createBroker,
  updateBroker,
  deleteBroker,
  fetchBrokerShareLink,
  clearBrokerShareLink,
  updateBrokerProfileByAdmin,
} from "@/store/slices/brokersSlice";
import { validateSession } from "@/store/slices/brokerAuthSlice";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BrokerWizard, type BrokerFormValues } from "@/components/BrokerWizard";
import BrokerShareLinkModal from "@/components/BrokerShareLinkModal";
import BrokerSchedulerLinkModal from "@/components/BrokerSchedulerLinkModal";
import { DataGrid, type DataGridColumn } from "@/components/ui/data-grid";
import {
  UserCog,
  User,
  Plus,
  Trash2,
  Search,
  Mail,
  Phone,
  Link2,
  CalendarDays,
} from "lucide-react";
import type { Broker } from "@shared/api";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminPageMeta } from "@/lib/seo-helpers";
import PhoneLink from "@/components/PhoneLink";
import EmailLink from "@/components/EmailLink";
import BrokerDetailPanel from "@/components/BrokerDetailPanel";

export default function Brokers() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { brokers, isLoading, pagination } = useAppSelector(
    (state) => state.brokers,
  );
  const { user: currentBroker, sessionToken } = useAppSelector(
    (state) => state.brokerAuth,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("first_name");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<"create" | "edit">("create");
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brokerToDelete, setBrokerToDelete] = useState<Broker | null>(null);
  const [shareLinkModalOpen, setShareLinkModalOpen] = useState(false);
  const [brokerForShareLink, setBrokerForShareLink] = useState<Broker | null>(
    null,
  );
  const [schedulerLinkModalOpen, setSchedulerLinkModalOpen] = useState(false);
  const [brokerForSchedulerLink, setBrokerForSchedulerLink] =
    useState<Broker | null>(null);
  const [detailBrokerId, setDetailBrokerId] = useState<number | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  const handleOpenDetail = (b: Broker) => {
    setDetailBrokerId(b.id);
    setDetailPanelOpen(true);
  };

  const handleOpenSchedulerLink = (b: Broker) => {
    setBrokerForSchedulerLink(b);
    setSchedulerLinkModalOpen(true);
  };

  const isAdmin = currentBroker?.role === "admin";

  const doFetch = useCallback(
    (params: {
      page?: number;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC";
      search?: string;
    }) => {
      dispatch(fetchBrokers({ limit: 30, ...params }));
    },
    [dispatch],
  );

  const handleSort = (field: string) => {
    const newDir = sortBy === field && sortDir === "ASC" ? "DESC" : "ASC";
    setSortBy(field);
    setSortDir(newDir);
    doFetch({
      page: 1,
      sortBy: field,
      sortOrder: newDir,
      search: searchQuery || undefined,
    });
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    doFetch({ page: 1, sortBy, sortOrder: sortDir, search: q || undefined });
  };

  useEffect(() => {
    if (!currentBroker && sessionToken) {
      dispatch(validateSession());
    }
  }, [dispatch, currentBroker, sessionToken]);

  useEffect(() => {
    doFetch({ page: 1, sortBy, sortOrder: sortDir });
  }, [dispatch]);

  const handleCreateBroker = () => {
    setWizardMode("create");
    setSelectedBroker(null);
    setWizardOpen(true);
  };

  const handleEditBroker = (broker: Broker) => {
    setWizardMode("edit");
    setSelectedBroker(broker);
    setWizardOpen(true);
  };

  const handleDeleteClick = (broker: Broker) => {
    setBrokerToDelete(broker);
    setDeleteDialogOpen(true);
  };

  const handleShareLinkClick = (broker: Broker) => {
    setBrokerForShareLink(broker);
    setShareLinkModalOpen(true);
  };

  const handleWizardSubmit = async (values: BrokerFormValues) => {
    try {
      if (wizardMode === "create") {
        const newBroker = await dispatch(
          createBroker({
            email: values.email,
            first_name: values.first_name,
            last_name: values.last_name,
            phone: values.phone || undefined,
            role: values.role,
            license_number: values.license_number || undefined,
            specializations:
              values.specializations.length > 0
                ? values.specializations
                : undefined,
          }),
        ).unwrap();
        // If a partner, set the assigned MB right away
        if (
          values.role === "broker" &&
          values.created_by_broker_id &&
          newBroker?.id
        ) {
          await dispatch(
            updateBroker({
              id: newBroker.id,
              created_by_broker_id: values.created_by_broker_id,
            }),
          ).unwrap();
        }
        // Save profile fields if any were filled
        const hasProfileData =
          values.bio ||
          values.office_address ||
          values.office_city ||
          values.office_state ||
          values.office_zip ||
          values.years_experience ||
          values.facebook_url ||
          values.instagram_url ||
          values.linkedin_url ||
          values.twitter_url ||
          values.youtube_url ||
          values.website_url;
        if (hasProfileData && newBroker?.id) {
          await dispatch(
            updateBrokerProfileByAdmin({
              id: newBroker.id,
              bio: values.bio || undefined,
              office_address: values.office_address || undefined,
              office_city: values.office_city || undefined,
              office_state: values.office_state || undefined,
              office_zip: values.office_zip || undefined,
              years_experience: values.years_experience
                ? Number(values.years_experience)
                : undefined,
              facebook_url: values.facebook_url || undefined,
              instagram_url: values.instagram_url || undefined,
              linkedin_url: values.linkedin_url || undefined,
              twitter_url: values.twitter_url || undefined,
              youtube_url: values.youtube_url || undefined,
              website_url: values.website_url || undefined,
            }),
          ).unwrap();
        }
        toast({
          title: "Success",
          description: "Realtor created successfully",
        });
      } else if (selectedBroker) {
        await dispatch(
          updateBroker({
            id: selectedBroker.id,
            first_name: values.first_name,
            last_name: values.last_name,
            phone: values.phone || undefined,
            role: values.role,
            license_number: values.license_number || undefined,
            specializations:
              values.specializations.length > 0
                ? values.specializations
                : undefined,
            created_by_broker_id:
              values.role === "broker"
                ? (values.created_by_broker_id ?? null)
                : undefined,
          }),
        ).unwrap();
        // Update profile fields if any profile data is present
        const hasProfileData =
          values.bio ||
          values.office_address ||
          values.office_city ||
          values.office_state ||
          values.office_zip ||
          values.years_experience ||
          values.facebook_url ||
          values.instagram_url ||
          values.linkedin_url ||
          values.twitter_url ||
          values.youtube_url ||
          values.website_url;
        if (hasProfileData) {
          await dispatch(
            updateBrokerProfileByAdmin({
              id: selectedBroker.id,
              bio: values.bio || undefined,
              office_address: values.office_address || undefined,
              office_city: values.office_city || undefined,
              office_state: values.office_state || undefined,
              office_zip: values.office_zip || undefined,
              years_experience: values.years_experience
                ? Number(values.years_experience)
                : undefined,
              facebook_url: values.facebook_url || undefined,
              instagram_url: values.instagram_url || undefined,
              linkedin_url: values.linkedin_url || undefined,
              twitter_url: values.twitter_url || undefined,
              youtube_url: values.youtube_url || undefined,
              website_url: values.website_url || undefined,
            }),
          ).unwrap();
        }
        toast({
          title: "Success",
          description: "Realtor updated successfully",
        });
      }
      setWizardOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Operation failed",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!brokerToDelete) return;

    try {
      await dispatch(deleteBroker(brokerToDelete.id)).unwrap();
      toast({
        title: "Success",
        description: "Realtor deleted successfully",
      });
      setDeleteDialogOpen(false);
      setBrokerToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to delete realtor",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "suspended":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    return role === "admin"
      ? "bg-purple-100 text-purple-800 hover:bg-purple-100"
      : "bg-blue-100 text-blue-800 hover:bg-blue-100";
  };

  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Realtor Management",
          "Manage realtor accounts and permissions",
        )}
      />
      <div className="space-y-6 p-6">
        {/* Header */}
        <PageHeader
          icon={<UserCog className="h-7 w-7 text-primary" />}
          title="Realtor Management"
          description="Manage realtor accounts and permissions"
          className="mb-0"
          actions={
            isAdmin ? (
              <Button onClick={handleCreateBroker} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Realtor
              </Button>
            ) : undefined
          }
        />

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-white rounded-lg border p-3">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search realtors by name or email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* Brokers Table */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <DataGrid<Broker>
            data={brokers}
            rowKey={(b) => b.id}
            columns={[
              {
                key: "first_name",
                label: "Name",
                sortable: true,
                className: "min-w-[140px]",
                render: (b) => (
                  <button
                    className="font-medium truncate block text-left hover:text-primary hover:underline transition-colors"
                    onClick={() => handleOpenDetail(b)}
                  >
                    {b.first_name} {b.last_name}
                  </button>
                ),
              },
              {
                key: "email",
                label: "Contact",
                className: "min-w-[180px]",
                render: (b) => (
                  <div className="flex flex-col gap-1 text-sm min-w-0">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <EmailLink
                        email={b.email}
                        className="text-sm text-gray-600"
                      />
                    </div>
                    {b.phone && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <PhoneLink
                          phone={b.phone}
                          clientName={`${b.first_name} ${b.last_name}`}
                          className="text-sm text-gray-600"
                        />
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "role",
                label: "Role",
                sortable: true,
                shrink: true,
                render: (b) => {
                  const assignedMB =
                    b.role === "broker" && b.created_by_broker_id
                      ? brokers.find((mb) => mb.id === b.created_by_broker_id)
                      : null;
                  return (
                    <div className="space-y-1">
                      <Badge className={getRoleBadgeColor(b.role)}>
                        {b.role === "admin" ? "Mortgage Banker" : "Partner"}
                      </Badge>
                      {assignedMB && (
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                          → {assignedMB.first_name} {assignedMB.last_name}
                        </p>
                      )}
                    </div>
                  );
                },
              },
              {
                key: "status",
                label: "Status",
                sortable: true,
                shrink: true,
                render: (b) => (
                  <Badge variant={getStatusBadgeVariant(b.status)}>
                    {b.status}
                  </Badge>
                ),
              },
              {
                key: "license_number",
                label: "License",
                sortable: true,
                shrink: true,
                render: (b) => (
                  <span className="text-sm text-gray-600">
                    {b.license_number || "\u2014"}
                  </span>
                ),
              },
              {
                key: "specializations",
                label: "Specializations",
                wrap: true,
                render: (b) =>
                  b.specializations && b.specializations.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {b.specializations.slice(0, 2).map((spec) => (
                        <Badge key={spec} variant="outline" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                      {b.specializations.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{b.specializations.length - 2}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">\u2014</span>
                  ),
              },
              {
                key: "last_login",
                label: "Last Login",
                shrink: true,
                render: (b) => {
                  if (!b.last_login) {
                    return (
                      <span className="text-xs text-gray-400 italic">
                        Never
                      </span>
                    );
                  }
                  const normalized =
                    /[Zz+\-]\d{2}:?\d{2}$/.test(b.last_login) ||
                    b.last_login.endsWith("Z")
                      ? b.last_login
                      : b.last_login.replace(" ", "T") + "Z";
                  const d = new Date(normalized);
                  const now = new Date();
                  const diffMs = now.getTime() - d.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffHrs = Math.floor(diffMins / 60);
                  const diffDays = Math.floor(diffHrs / 24);
                  let relative: string;
                  if (diffMins < 1) relative = "Just now";
                  else if (diffMins < 60) relative = `${diffMins}m ago`;
                  else if (diffHrs < 24) relative = `${diffHrs}h ago`;
                  else if (diffDays === 1) relative = "Yesterday";
                  else if (diffDays < 7) relative = `${diffDays}d ago`;
                  else
                    relative = d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  const exact = d.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });
                  return (
                    <div title={exact} className="cursor-default">
                      <p className="text-xs font-medium text-foreground">
                        {relative}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {exact}
                      </p>
                    </div>
                  );
                },
              },
              ...(isAdmin
                ? [
                    {
                      key: "actions",
                      label: "Actions",
                      shrink: true,
                      headerClassName: "text-right",
                      render: (b: Broker) => (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View profile"
                            onClick={() => handleOpenDetail(b)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <User className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Copy scheduler link"
                            onClick={() => handleOpenSchedulerLink(b)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <CalendarDays className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Get share link"
                            onClick={() => handleShareLinkClick(b)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(b)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={b.id === currentBroker?.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ),
                    } as DataGridColumn<Broker>,
                  ]
                : []),
            ]}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            pagination={pagination}
            onPageChange={(page) =>
              doFetch({
                page,
                sortBy,
                sortOrder: sortDir,
                search: searchQuery || undefined,
              })
            }
            isLoading={isLoading}
            emptyMessage="No realtors found."
            mobileCard={(broker) => (
              <div className="p-4 space-y-2 border-b">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">
                      {broker.first_name} {broker.last_name}
                    </p>
                    <EmailLink
                      email={broker.email}
                      className="text-xs text-muted-foreground"
                    />
                    {broker.phone && (
                      <PhoneLink
                        phone={broker.phone}
                        clientName={`${broker.first_name} ${broker.last_name}`}
                        className="text-xs text-muted-foreground"
                      />
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={getRoleBadgeColor(broker.role)}>
                      {broker.role === "admin" ? "Mortgage Banker" : "Partner"}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(broker.status)}>
                      {broker.status}
                    </Badge>
                  </div>
                </div>
                {broker.license_number && (
                  <p className="text-xs text-muted-foreground">
                    License: {broker.license_number}
                  </p>
                )}
                {isAdmin && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Copy scheduler link"
                      onClick={() => handleOpenSchedulerLink(broker)}
                      className="h-8 gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShareLinkClick(broker)}
                      className="h-8 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Link2 className="h-3.5 w-3.5" /> Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(broker)}
                      className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={broker.id === currentBroker?.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          />
        </div>

        {/* Broker Wizard */}
        <BrokerWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onSubmit={handleWizardSubmit}
          broker={selectedBroker}
          mode={wizardMode}
        />

        {/* Share Link Modal */}
        <BrokerShareLinkModal
          open={shareLinkModalOpen}
          onOpenChange={(open) => {
            setShareLinkModalOpen(open);
            if (!open) setBrokerForShareLink(null);
          }}
          broker={brokerForShareLink}
        />

        {/* Scheduler Link Modal */}
        <BrokerSchedulerLinkModal
          open={schedulerLinkModalOpen}
          onOpenChange={(open) => {
            setSchedulerLinkModalOpen(open);
            if (!open) setBrokerForSchedulerLink(null);
          }}
          broker={brokerForSchedulerLink}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Realtor</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <strong>
                  {brokerToDelete?.first_name} {brokerToDelete?.last_name}
                </strong>
                ? This will set their status to inactive and they will no longer
                be able to access the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBrokerToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Broker Detail Panel */}
        <BrokerDetailPanel
          isOpen={detailPanelOpen}
          onClose={() => {
            setDetailPanelOpen(false);
            setDetailBrokerId(null);
            // Refresh list in case of conversion
            doFetch({
              page: 1,
              sortBy,
              sortOrder: sortDir,
              search: searchQuery || undefined,
            });
          }}
          brokerId={detailBrokerId}
        />
      </div>
    </>
  );
}
