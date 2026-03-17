import React, { useEffect, useState } from "react";
import {
  MessageSquare,
  Search,
  Mail,
  Phone,
  Clock,
  Eye,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchContactSubmissions } from "@/store/slices/contactSubmissionsSlice";
import type { ContactSubmission } from "@shared/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const ContactSubmissions = () => {
  const dispatch = useAppDispatch();
  const { submissions, isLoading } = useAppSelector(
    (state) => state.contactSubmissions,
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContactSubmission | null>(null);

  useEffect(() => {
    dispatch(fetchContactSubmissions());
  }, [dispatch]);

  const filtered = submissions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.subject.toLowerCase().includes(q) ||
      (s.phone || "").toLowerCase().includes(q)
    );
  });

  const unreadCount = submissions.filter((s) => !s.is_read).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <MetaHelmet
        title="Contact Submissions | Admin"
        description="View website contact form submissions"
      />

      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Contact Submissions
            {unreadCount > 0 && (
              <Badge className="ml-1 bg-primary text-primary-foreground">
                {unreadCount} new
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Messages sent from the public contact form
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch(fetchContactSubmissions())}
          disabled={isLoading}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Inbox className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{submissions.length}</p>
              <p className="text-xs text-muted-foreground">Total Messages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unreadCount}</p>
              <p className="text-xs text-muted-foreground">Unread</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Eye className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {submissions.filter((s) => s.is_read).length}
              </p>
              <p className="text-xs text-muted-foreground">Read</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">All Submissions</CardTitle>
              <CardDescription>
                {filtered.length} message{filtered.length !== 1 ? "s" : ""}
                {search ? " matching your search" : ""}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, subject…"
                className="pl-8 h-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading submissions…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Inbox className="h-8 w-8 opacity-30" />
              <p className="text-sm">
                {search
                  ? "No messages match your search."
                  : "No contact submissions yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-6" />
                    <TableHead>From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Phone
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Date
                      </span>
                    </TableHead>
                    <TableHead className="w-16 text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub) => (
                    <TableRow
                      key={sub.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                        !sub.is_read && "bg-primary/3 font-medium",
                      )}
                      onClick={() => setSelected(sub)}
                    >
                      <TableCell>
                        {!sub.is_read && (
                          <span className="block h-2 w-2 rounded-full bg-primary" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold leading-none">
                            {sub.name}
                          </span>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {sub.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm line-clamp-1">
                          {sub.subject}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {sub.phone || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(sub.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(sub);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  {selected.subject}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Sender info */}
                <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold w-14 text-muted-foreground shrink-0">
                      From
                    </span>
                    <span>{selected.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <a
                      href={`mailto:${selected.email}`}
                      className="text-primary hover:underline"
                    >
                      {selected.email}
                    </a>
                  </div>
                  {selected.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={`tel:${selected.phone}`}
                        className="hover:underline"
                      >
                        {selected.phone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {formatDateTime(selected.created_at)}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Message
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap border rounded-lg p-4 bg-background">
                    {selected.message}
                  </p>
                </div>

                {/* Quick reply */}
                <a
                  href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                >
                  <Button className="w-full gap-2">
                    <Mail className="h-4 w-4" />
                    Reply via Email
                  </Button>
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactSubmissions;
