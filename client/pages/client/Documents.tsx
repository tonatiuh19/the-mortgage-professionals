import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Search,
  Filter,
  FolderOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileQuestion,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  File,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchClientDocuments,
  selectClientDocuments,
  selectDocumentsLoading,
} from "@/store/slices/clientPortalSlice";

// ─── Helpers ───────────────────────────────────────────────────────────────

const BASE_URL = "https://disruptinglabs.com/data/api";

const toFullUrl = (path: string) =>
  path ? (path.startsWith("http") ? path : `${BASE_URL}${path}`) : "";

const formatBytes = (bytes: number | null) => {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const taskStatusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    icon: <Clock className="h-3 w-3" />,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: <RotateCcw className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  pending_approval: {
    label: "In Review",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    icon: <Clock className="h-3 w-3" />,
  },
  approved: {
    label: "Approved",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  reopened: {
    label: "Needs Revision",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

// ─── Component ────────────────────────────────────────────────────────────

const Documents = () => {
  const dispatch = useAppDispatch();
  const documents = useAppSelector(selectClientDocuments);
  const loading = useAppSelector(selectDocumentsLoading);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "pdf" | "image">("all");
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  useEffect(() => {
    dispatch(fetchClientDocuments());
  }, [dispatch]);

  // Filter documents
  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchesType =
        filterType === "all" || doc.document_type === filterType;
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        doc.original_filename.toLowerCase().includes(term) ||
        doc.task_title.toLowerCase().includes(term) ||
        doc.application_number.toLowerCase().includes(term);
      return matchesType && matchesSearch;
    });
  }, [documents, search, filterType]);

  // Group by task
  const groupedByTask = useMemo(() => {
    const map = new Map<
      number,
      {
        taskId: number;
        taskTitle: string;
        taskStatus: string;
        applicationNumber: string;
        loanType: string;
        propertyAddress: string;
        propertyCity?: string;
        propertyState?: string;
        docs: typeof filtered;
      }
    >();

    for (const doc of filtered) {
      if (!map.has(doc.task_id)) {
        map.set(doc.task_id, {
          taskId: doc.task_id,
          taskTitle: doc.task_title,
          taskStatus: doc.task_status,
          applicationNumber: doc.application_number,
          loanType: doc.loan_type,
          propertyAddress: doc.property_address,
          propertyCity: doc.property_city,
          propertyState: doc.property_state,
          docs: [],
        });
      }
      map.get(doc.task_id)!.docs.push(doc);
    }

    return Array.from(map.values());
  }, [filtered]);

  const toggleTask = (taskId: number) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const pdfCount = documents.filter((d) => d.document_type === "pdf").length;
  const imageCount = documents.filter(
    (d) => d.document_type === "image",
  ).length;

  // Auto-expand all tasks when results change (e.g. user searches something)
  useEffect(() => {
    if (filtered.length > 0) {
      setExpandedTasks(new Set(groupedByTask.map((g) => g.taskId)));
    }
  }, [groupedByTask.length]);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 rounded-xl bg-muted animate-pulse" />
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border bg-card p-6 space-y-4 animate-pulse"
          >
            <div className="h-5 w-48 bg-muted rounded-lg" />
            {[1, 2].map((j) => (
              <div key={j} className="flex gap-4 items-center">
                <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-56 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-3xl font-bold tracking-tight">My Documents</h1>
        <p className="text-muted-foreground">
          All documents you've uploaded across your loan tasks.
        </p>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          {
            label: "Total Documents",
            value: documents.length,
            color: "text-primary",
            bg: "bg-primary/5 border-primary/10",
            icon: <File className="h-5 w-5 text-primary" />,
          },
          {
            label: "PDFs",
            value: pdfCount,
            color: "text-red-600",
            bg: "bg-red-500/5 border-red-500/10",
            icon: <FileText className="h-5 w-5 text-red-500" />,
          },
          {
            label: "Images",
            value: imageCount,
            color: "text-blue-600",
            bg: "bg-blue-500/5 border-blue-500/10",
            icon: <ImageIcon className="h-5 w-5 text-blue-500" />,
          },
        ].map((stat) => (
          <Card key={stat.label} className={cn("border", stat.bg)}>
            <CardContent className="pt-5 pb-4 px-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background border">
                {stat.icon}
              </div>
              <div>
                <p
                  className={cn("text-2xl font-bold leading-none", stat.color)}
                >
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stat.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Search + Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by filename, task name, or application…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pdf", "image"] as const).map((type) => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type)}
              className={cn(
                "rounded-xl h-11 px-4 capitalize",
                filterType === type && "shadow-lg shadow-primary/20",
              )}
            >
              {type === "all" && <Filter className="mr-1.5 h-3.5 w-3.5" />}
              {type === "pdf" && <FileText className="mr-1.5 h-3.5 w-3.5" />}
              {type === "image" && <ImageIcon className="mr-1.5 h-3.5 w-3.5" />}
              {type === "all" ? "All Types" : type.toUpperCase()}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Empty state */}
      {documents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="rounded-2xl bg-muted/40 p-8 mb-5">
            <FolderOpen className="h-14 w-14 text-muted-foreground/40 mx-auto" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Documents Yet</h3>
          <p className="text-muted-foreground max-w-sm leading-relaxed">
            Documents you upload while completing your loan tasks will appear
            here.
          </p>
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <FileQuestion className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">No results found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filter.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {groupedByTask.map((group, idx) => {
              const isOpen = expandedTasks.has(group.taskId);
              const statusCfg =
                taskStatusConfig[group.taskStatus] ??
                taskStatusConfig["pending"];
              const addr = [
                group.propertyAddress,
                group.propertyCity,
                group.propertyState,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <motion.div
                  key={group.taskId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card className="overflow-hidden border shadow-sm">
                    {/* Task header — collapsible */}
                    <button
                      type="button"
                      onClick={() => toggleTask(group.taskId)}
                      className="w-full text-left"
                    >
                      <CardHeader className="py-4 px-6 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <CardTitle className="text-base font-bold truncate">
                                {group.taskTitle}
                              </CardTitle>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "flex items-center gap-1 text-[11px] py-0 px-2",
                                  statusCfg.color,
                                )}
                              >
                                {statusCfg.icon}
                                {statusCfg.label}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span>
                                Application{" "}
                                <span className="font-semibold text-foreground">
                                  #{group.applicationNumber}
                                </span>
                              </span>
                              {addr && <span>· {addr}</span>}
                              <span>
                                ·{" "}
                                <span className="font-medium">
                                  {group.docs.length}
                                </span>{" "}
                                {group.docs.length === 1
                                  ? "document"
                                  : "documents"}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 text-muted-foreground mt-0.5">
                            {isOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </button>

                    {/* Document list */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <CardContent className="px-6 pb-5 pt-0">
                            <div className="border-t pt-4 space-y-2">
                              {group.docs.map((doc) => {
                                const isPdf = doc.document_type === "pdf";
                                const url = toFullUrl(doc.file_path);
                                const size = formatBytes(doc.file_size);

                                return (
                                  <div
                                    key={doc.id}
                                    className="flex items-center gap-4 rounded-xl border bg-muted/20 px-4 py-3 group hover:bg-muted/40 transition-colors"
                                  >
                                    {/* Icon */}
                                    <div
                                      className={cn(
                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                                        isPdf
                                          ? "bg-red-500/10 border-red-500/20"
                                          : "bg-blue-500/10 border-blue-500/20",
                                      )}
                                    >
                                      {isPdf ? (
                                        <FileText className="h-5 w-5 text-red-500" />
                                      ) : (
                                        <ImageIcon className="h-5 w-5 text-blue-500" />
                                      )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold truncate">
                                        {doc.original_filename || doc.filename}
                                      </p>
                                      <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-muted-foreground">
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "text-[10px] py-0 px-1.5",
                                            isPdf
                                              ? "border-red-500/20 text-red-500"
                                              : "border-blue-500/20 text-blue-500",
                                          )}
                                        >
                                          {doc.document_type.toUpperCase()}
                                        </Badge>
                                        {size && <span>{size}</span>}
                                        <span>
                                          Uploaded {formatDate(doc.uploaded_at)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    {url && (
                                      <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg"
                                            title="Open"
                                          >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                          </Button>
                                        </a>
                                        <a
                                          href={url}
                                          download={
                                            doc.original_filename ||
                                            doc.filename
                                          }
                                        >
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg"
                                            title="Download"
                                          >
                                            <Download className="h-3.5 w-3.5" />
                                          </Button>
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Documents;
