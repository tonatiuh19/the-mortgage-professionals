import React, { useEffect, useState, useCallback } from "react";
import { Users, Search, Phone, Trash2, Plus } from "lucide-react";
import PhoneLink from "@/components/PhoneLink";
import EmailLink from "@/components/EmailLink";
import ClientFormDialog from "@/components/ClientFormDialog";
import ClientDetailPanel from "@/components/ClientDetailPanel";
import { MetaHelmet } from "@/components/MetaHelmet";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminPageMeta } from "@/lib/seo-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataGrid, type DataGridColumn } from "@/components/ui/data-grid";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchClients, deleteClient } from "@/store/slices/clientsSlice";
import { useToast } from "@/hooks/use-toast";
import type { GetClientsResponse } from "@shared/api";

type ClientRow = GetClientsResponse["clients"][0];

const Clients = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const {
    clients,
    isLoading: loading,
    pagination,
  } = useAppSelector((state) => state.clients);
  const { user } = useAppSelector((state) => state.brokerAuth);
  const isPartner = user?.role === "broker";
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("first_name");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");
  const [formOpen, setFormOpen] = useState(false);
  const [detailClientId, setDetailClientId] = useState<number | null>(null);

  const doFetch = useCallback(
    (params: {
      page?: number;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC";
      search?: string;
    }) => {
      dispatch(fetchClients({ limit: 30, ...params }));
    },
    [dispatch],
  );

  useEffect(() => {
    doFetch({
      page: 1,
      sortBy,
      sortOrder: sortDir,
      search: searchQuery || undefined,
    });
  }, [dispatch]);

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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleDeleteClick = (client: any) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;

    setIsDeleting(true);
    try {
      await dispatch(deleteClient(clientToDelete.id)).unwrap();

      toast({
        title: "Client Deleted",
        description: `${clientToDelete.first_name} ${clientToDelete.last_name} has been deleted successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Cannot Delete Client",
        description:
          error ||
          "This client has associated data that must be handled first.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const columns: DataGridColumn<ClientRow>[] = [
    {
      key: "first_name",
      label: "Client",
      sortable: true,
      sticky: true,
      className: "min-w-[160px]",
      render: (client) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(client.first_name, client.last_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium truncate">
              {client.first_name} {client.last_name}
            </div>
            <div className="text-xs text-muted-foreground">ID: {client.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Contact",
      sortable: true,
      className: "min-w-[180px]",
      render: (client) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <EmailLink
              email={client.email}
              className="text-sm text-foreground"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            {client.phone ? (
              <PhoneLink
                phone={client.phone}
                clientName={`${client.first_name} ${client.last_name}`}
                clientId={client.id}
                className="text-sm text-foreground"
              />
            ) : (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3 w-3" />
                No phone
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "total_applications",
      label: "Applications",
      sortable: true,
      shrink: true,
      render: (client) => (
        <Badge variant="outline" className="text-xs">
          {client.total_applications} total
        </Badge>
      ),
    },
    {
      key: "active_applications",
      label: "Active",
      sortable: true,
      shrink: true,
      render: (client) => (
        <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
          {client.active_applications} active
        </Badge>
      ),
    },
    {
      key: "date_of_birth",
      label: "Date of Birth",
      sortable: true,
      shrink: true,
      className: "text-sm",
      render: (client) =>
        client.date_of_birth ? (
          new Date(client.date_of_birth).toLocaleDateString()
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "created_at",
      label: "Joined",
      sortable: true,
      shrink: true,
      className: "text-sm text-muted-foreground",
      render: (client) => new Date(client.created_at).toLocaleDateString(),
    },
    ...(!isPartner
      ? [
          {
            key: "actions",
            label: "Actions",
            shrink: true,
            render: (client: ClientRow) => (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(client);
                  }}
                  disabled={isDeleting}
                  className="h-7 text-xs gap-1 border-red-500 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </div>
            ),
          } as DataGridColumn<ClientRow>,
        ]
      : []),
  ];

  const clientStats = {
    total: pagination?.total ?? clients.length,
    totalApplications: clients.reduce(
      (sum, c) => sum + c.total_applications,
      0,
    ),
    activeApplications: clients.reduce(
      (sum, c) => sum + c.active_applications,
      0,
    ),
  };

  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Clients",
          "Manage your client database and communications",
        )}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <PageHeader
          icon={<Users className="h-7 w-7 text-primary" />}
          title="Clients"
          description="Manage your client relationships and applications"
          actions={
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              {!isPartner && (
                <Button
                  onClick={() => {
                    setFormOpen(true);
                  }}
                  className="gap-1.5 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  New Client
                </Button>
              )}
            </div>
          }
        />

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading clients...
          </div>
        ) : clients.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Clients will appear here when you create loan applications
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Clients Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Clients</CardTitle>
                <CardDescription>
                  {pagination
                    ? `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} clients`
                    : `${clients.length} clients`}
                  {searchQuery && ` matching "${searchQuery}"`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataGrid<ClientRow>
                  data={clients}
                  rowKey={(c) => c.id}
                  columns={columns}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                  onRowClick={(client) => setDetailClientId(client.id)}
                  pagination={pagination}
                  onPageChange={(page) =>
                    doFetch({
                      page,
                      sortBy,
                      sortOrder: sortDir,
                      search: searchQuery || undefined,
                    })
                  }
                  isLoading={loading}
                  emptyMessage="No clients match your search."
                  mobileCard={(client) => (
                    <div className="rounded-lg border p-4 space-y-2 bg-white shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                              {getInitials(client.first_name, client.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {client.first_name} {client.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID: {client.id}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-xs">
                            {client.total_applications} apps
                          </Badge>
                          <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                            {client.active_applications} active
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <EmailLink
                            email={client.email}
                            className="text-xs text-muted-foreground"
                          />
                        </div>
                        {client.phone && (
                          <PhoneLink
                            phone={client.phone}
                            clientName={`${client.first_name} ${client.last_name}`}
                            clientId={client.id}
                            className="text-xs text-muted-foreground"
                          />
                        )}
                      </div>
                      {!isPartner && (
                        <div className="flex justify-end gap-1 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(client)}
                            disabled={isDeleting}
                            className="h-7 text-xs gap-1 border-red-500 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Client Dialog */}
        <ClientFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          client={null}
        />

        {/* Client Detail Panel */}
        <ClientDetailPanel
          isOpen={detailClientId !== null}
          onClose={() => setDetailClientId(null)}
          clientId={detailClientId}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete Client — Permanent Action
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <span className="block">
                    You are about to permanently delete{" "}
                    <strong>
                      {clientToDelete?.first_name} {clientToDelete?.last_name}
                    </strong>
                    . This action <strong>cannot be undone</strong>.
                  </span>
                  {clientToDelete && (
                    <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 space-y-2">
                      <span className="block font-semibold text-sm">
                        ⚠️ The following data will be permanently deleted:
                      </span>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>
                          <strong>
                            {clientToDelete.total_applications ?? 0}
                          </strong>{" "}
                          loan application(s) (
                          {clientToDelete.active_applications ?? 0} active)
                        </li>
                        {(clientToDelete.total_conversations ?? 0) > 0 && (
                          <li>
                            <strong>
                              {clientToDelete.total_conversations}
                            </strong>{" "}
                            conversation thread(s) and all associated messages
                            (emails, SMS, WhatsApp)
                          </li>
                        )}
                        <li>All client profile data and documents</li>
                      </ul>
                      {(clientToDelete.active_applications ?? 0) > 0 && (
                        <span className="block text-sm font-semibold mt-2 text-red-600 dark:text-red-400">
                          ⛔ This client has active applications — reassign or
                          close them before deleting.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete Client"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default Clients;
