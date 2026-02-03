import React, { useEffect } from "react";
import { Users, Search, Mail, Phone } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchClients } from "@/store/slices/clientsSlice";

const Clients = () => {
  const dispatch = useAppDispatch();
  const { clients, isLoading: loading } = useAppSelector(
    (state) => state.clients,
  );

  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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
              <Users className="h-7 w-7 text-blue-500" />
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
                  <div className="text-2xl font-bold text-blue-500">
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-blue-500/10 text-blue-500 font-semibold">
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
                          <Badge className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                            {client.active_applications} active
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">N/A</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">N/A</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
};

export default Clients;
