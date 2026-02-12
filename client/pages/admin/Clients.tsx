import React, { useEffect, useState } from "react";
import { Users, Search, Mail, Phone, Trash2 } from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchClients, deleteClient } from "@/store/slices/clientsSlice";
import { useToast } from "@/hooks/use-toast";

const Clients = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { clients, isLoading: loading } = useAppSelector(
    (state) => state.clients,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

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

  const clientStats = {
    total: clients.length,
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
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              Clients
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your client relationships and applications
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clients..." className="pl-9" />
            </div>
          </div>
        </header>

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
            {/* Client Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Clients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clientStats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Applications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {clientStats.totalApplications}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Applications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {Number(clientStats.activeApplications)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clients Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Clients</CardTitle>
                <CardDescription>
                  Showing {clients.length} clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Applications</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Date of Birth</TableHead>
                      <TableHead>SSN</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {getInitials(
                                  client.first_name,
                                  client.last_name,
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {client.first_name} {client.last_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Client ID: {client.id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">
                                {client.email}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{client.phone || "No phone"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {client.total_applications} total
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                            {client.active_applications} active
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">N/A</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">N/A</span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(client)}
                            disabled={isDeleting}
                            className="h-7 text-xs gap-1 border-red-500 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Client</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Are you sure you want to delete "{clientToDelete?.first_name}{" "}
                  {clientToDelete?.last_name}"?
                </p>
                {clientToDelete && (
                  <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500">
                    <div className="text-sm">
                      <p className="font-semibold">Warning:</p>
                      <p>
                        This client has {clientToDelete.total_applications}{" "}
                        total applications and{" "}
                        {clientToDelete.active_applications} active
                        applications.
                      </p>
                      <p className="mt-1">
                        All associated data must be reassigned or completed
                        before deletion.
                      </p>
                    </div>
                  </div>
                )}
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
