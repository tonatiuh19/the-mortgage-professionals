import React, { useEffect, useMemo } from "react";
import {
  FileText,
  Image,
  Search,
  Filter,
  Download,
  ExternalLink,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { adminPageMeta } from "@/lib/seo-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchAllDocuments,
  deleteDocument,
  setSearchQuery,
  setFilterType,
  setFilterBroker,
  clearFilters,
} from "@/store/slices/documentsSlice";
import { toast } from "@/hooks/use-toast";

const Documents = () => {
  const dispatch = useAppDispatch();
  const { documents, isLoading, searchQuery, filterType, filterBroker } =
    useAppSelector((state) => state.documents);
  const { user } = useAppSelector((state) => state.brokerAuth);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    dispatch(fetchAllDocuments());
  }, [dispatch]);

  // Get unique brokers for filter
  const uniqueBrokers = useMemo(() => {
    const brokerMap = new Map();
    documents.forEach((doc) => {
      if (doc.broker_id && doc.broker_first_name && doc.broker_last_name) {
        brokerMap.set(doc.broker_id, {
          id: doc.broker_id,
          name: `${doc.broker_first_name} ${doc.broker_last_name}`,
        });
      }
    });
    return Array.from(brokerMap.values());
  }, [documents]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        doc.task_title.toLowerCase().includes(searchLower) ||
        doc.original_filename.toLowerCase().includes(searchLower) ||
        doc.client_first_name.toLowerCase().includes(searchLower) ||
        doc.client_last_name.toLowerCase().includes(searchLower) ||
        doc.application_number.toLowerCase().includes(searchLower);

      // Type filter
      const matchesType =
        filterType === "all" || doc.document_type === filterType;

      // Broker filter (only for admin)
      const matchesBroker = !filterBroker || doc.broker_id === filterBroker;

      return matchesSearch && matchesType && matchesBroker;
    });
  }, [documents, searchQuery, filterType, filterBroker]);

  const handleDelete = async (documentId: number) => {
    try {
      await dispatch(deleteDocument(documentId)).unwrap();
      toast({
        title: "Document deleted",
        description: "Document has been removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <MetaHelmet
        {...adminPageMeta("Documents", "Manage client documents and files")}
      />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Documents
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin
                ? "View and manage all client documents"
                : "View and manage your client documents"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch(clearFilters())}
              disabled={!searchQuery && filterType === "all" && !filterBroker}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch(fetchAllDocuments())}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Documents
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredDocuments.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PDFs</CardTitle>
              <FileText className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  filteredDocuments.filter((d) => d.document_type === "pdf")
                    .length
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Images</CardTitle>
              <Image className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  filteredDocuments.filter((d) => d.document_type === "image")
                    .length
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatFileSize(
                  filteredDocuments.reduce(
                    (sum, doc) => sum + (doc.file_size || 0),
                    0,
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by task, filename, client name, or application..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                />
              </div>
              <Select
                value={filterType}
                onValueChange={(value: any) => dispatch(setFilterType(value))}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pdf">PDFs Only</SelectItem>
                  <SelectItem value="image">Images Only</SelectItem>
                </SelectContent>
              </Select>
              {isAdmin && uniqueBrokers.length > 0 && (
                <Select
                  value={filterBroker?.toString() || "all"}
                  onValueChange={(value) =>
                    dispatch(
                      setFilterBroker(value === "all" ? null : parseInt(value)),
                    )
                  }
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filter by broker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brokers</SelectItem>
                    {uniqueBrokers.map((broker) => (
                      <SelectItem key={broker.id} value={broker.id.toString()}>
                        {broker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No documents found
                </h3>
                <p className="text-sm text-muted-foreground">
                  {documents.length === 0
                    ? "No documents have been uploaded yet"
                    : "Try adjusting your filters"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px] whitespace-nowrap">
                        Type
                      </TableHead>
                      <TableHead className="min-w-[250px] whitespace-nowrap">
                        Filename
                      </TableHead>
                      <TableHead className="min-w-[180px] whitespace-nowrap">
                        Task
                      </TableHead>
                      <TableHead className="min-w-[180px] whitespace-nowrap">
                        Client
                      </TableHead>
                      <TableHead className="w-[120px] whitespace-nowrap">
                        Application
                      </TableHead>
                      {isAdmin && (
                        <TableHead className="w-[140px] whitespace-nowrap">
                          Broker
                        </TableHead>
                      )}
                      <TableHead className="w-[100px] whitespace-nowrap">
                        Size
                      </TableHead>
                      <TableHead className="w-[150px] whitespace-nowrap">
                        Uploaded
                      </TableHead>
                      <TableHead className="w-[120px] text-right whitespace-nowrap">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          {doc.document_type === "pdf" ? (
                            <FileText className="h-5 w-5 text-destructive" />
                          ) : (
                            <Image className="h-5 w-5 text-primary" />
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate font-medium">
                            {doc.original_filename}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {doc.filename}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{doc.task_title}</div>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {doc.task_type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {doc.client_first_name} {doc.client_last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {doc.client_email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {doc.application_number}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {doc.broker_first_name && doc.broker_last_name ? (
                              <div className="text-sm">
                                {doc.broker_first_name} {doc.broker_last_name}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(doc.uploaded_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={`https://disruptinglabs.com${doc.file_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Document
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "
                                    {doc.original_filename}"? This action cannot
                                    be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(doc.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Documents;
