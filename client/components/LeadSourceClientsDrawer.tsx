import React, { useEffect, useState, useCallback } from "react";
import { Search, Phone, Users, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataGrid, type DataGridColumn } from "@/components/ui/data-grid";
import PhoneLink from "@/components/PhoneLink";
import EmailLink from "@/components/EmailLink";
import ClientDetailPanel from "@/components/ClientDetailPanel";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchClients } from "@/store/slices/clientsSlice";
import type { GetClientsResponse } from "@shared/api";

type ClientRow = GetClientsResponse["clients"][0];

interface LeadSourceClientsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sourceKey: string; // e.g. "builder"
  sourceLabel: string; // e.g. "Builder"
  sourceCode: string; // e.g. "BLDR"
  count: number;
}

const LeadSourceClientsDrawer: React.FC<LeadSourceClientsDrawerProps> = ({
  isOpen,
  onClose,
  sourceKey,
  sourceLabel,
  sourceCode,
  count,
}) => {
  const dispatch = useAppDispatch();
  const { clients, isLoading, pagination } = useAppSelector((s) => s.clients);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("first_name");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");
  const [detailClientId, setDetailClientId] = useState<number | null>(null);

  const doFetch = useCallback(
    (params: {
      page?: number;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC";
      search?: string;
    }) => {
      dispatch(fetchClients({ limit: 30, source: sourceKey, ...params }));
    },
    [dispatch, sourceKey],
  );

  useEffect(() => {
    if (isOpen && sourceKey) {
      setSearch("");
      setSortBy("first_name");
      setSortDir("ASC");
      doFetch({ page: 1, sortBy: "first_name", sortOrder: "ASC" });
    }
  }, [isOpen, sourceKey]);

  const handleSort = (field: string) => {
    const newDir = sortBy === field && sortDir === "ASC" ? "DESC" : "ASC";
    setSortBy(field);
    setSortDir(newDir);
    doFetch({
      page: 1,
      sortBy: field,
      sortOrder: newDir,
      search: search || undefined,
    });
  };

  const handleSearch = (q: string) => {
    setSearch(q);
    doFetch({ page: 1, sortBy, sortOrder: sortDir, search: q || undefined });
  };

  const getInitials = (first: string, last: string) =>
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  const columns: DataGridColumn<ClientRow>[] = [
    {
      key: "first_name",
      label: "Client",
      sortable: true,
      sticky: true,
      className: "min-w-[160px]",
      render: (client) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="shrink-0 h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
              {getInitials(client.first_name, client.last_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium truncate text-sm">
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
        <div className="space-y-0.5">
          <EmailLink email={client.email} className="text-sm text-foreground" />
          {client.phone ? (
            <PhoneLink
              phone={client.phone}
              clientName={`${client.first_name} ${client.last_name}`}
              clientId={client.id}
              className="text-sm text-foreground"
            />
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Phone className="h-3 w-3" />
              No phone
            </span>
          )}
        </div>
      ),
    },
    {
      key: "total_applications",
      label: "Loans",
      sortable: true,
      shrink: true,
      render: (client) => (
        <Badge variant="outline" className="text-xs">
          {client.total_applications}
        </Badge>
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
  ];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:w-[680px] sm:max-w-[680px] p-0 flex flex-col gap-0"
          style={{ maxWidth: "680px" }}
        >
          {/* Accessibility title (visually present in header) */}
          <SheetTitle className="sr-only">{sourceLabel} Clients</SheetTitle>

          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-5 border-b bg-gradient-to-br from-card to-muted/30 shrink-0">
            <div className="flex items-center justify-center rounded-lg px-2.5 py-1.5 text-sm font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
              {sourceCode}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                {sourceLabel}
              </h2>
              <p className="text-xs text-muted-foreground">
                {count} client{count !== 1 ? "s" : ""} from this source
              </p>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0">
              <Users className="w-3 h-3 mr-1" />
              {pagination?.total ?? count}
            </Badge>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-auto px-6 py-4">
            <DataGrid<ClientRow>
              columns={columns}
              data={clients}
              isLoading={isLoading}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              pagination={pagination ?? undefined}
              onPageChange={(page) =>
                doFetch({
                  page,
                  sortBy,
                  sortOrder: sortDir,
                  search: search || undefined,
                })
              }
              rowKey={(client) => client.id}
              onRowClick={(client) => setDetailClientId(client.id)}
              emptyMessage={
                search
                  ? `No clients matching "${search}" in ${sourceLabel}`
                  : `No clients with source "${sourceLabel}"`
              }
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Client detail panel */}
      <ClientDetailPanel
        isOpen={detailClientId !== null}
        onClose={() => setDetailClientId(null)}
        clientId={detailClientId}
      />
    </>
  );
};

export default LeadSourceClientsDrawer;
