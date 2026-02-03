import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchBrokers,
  createBroker,
  updateBroker,
  deleteBroker,
} from "@/store/slices/brokersSlice";
import { validateSession } from "@/store/slices/brokerAuthSlice";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { BrokerWizard, type BrokerFormValues } from "@/components/BrokerWizard";
import {
  UserCog,
  Plus,
  Pencil,
  Trash2,
  Search,
  Mail,
  Phone,
} from "lucide-react";
import type { Broker } from "@shared/api";
import { MetaHelmet } from "@/components/MetaHelmet";
import { adminPageMeta } from "@/lib/seo-helpers";

export default function Brokers() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { brokers, isLoading } = useAppSelector((state) => state.brokers);
  const { user: currentBroker, sessionToken } = useAppSelector(
    (state) => state.brokerAuth,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<"create" | "edit">("create");
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brokerToDelete, setBrokerToDelete] = useState<Broker | null>(null);

  const isAdmin = currentBroker?.role === "admin";

  useEffect(() => {
    // Validate session to load user data if not already loaded
    if (!currentBroker && sessionToken) {
      dispatch(validateSession());
    }
  }, [dispatch, currentBroker, sessionToken]);

  useEffect(() => {
    dispatch(fetchBrokers());
  }, [dispatch]);

  const filteredBrokers = brokers.filter(
    (broker) =>
      broker.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      broker.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      broker.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

  const handleWizardSubmit = async (values: BrokerFormValues) => {
    try {
      if (wizardMode === "create") {
        await dispatch(
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
        toast({
          title: "Success",
          description: "Broker created successfully",
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
          }),
        ).unwrap();
        toast({
          title: "Success",
          description: "Broker updated successfully",
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
        description: "Broker deleted successfully",
      });
      setDeleteDialogOpen(false);
      setBrokerToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Failed to delete broker",
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
          "Broker Management",
          "Manage broker accounts and permissions",
        )}
      />
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3">
              <UserCog className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Broker Management
              </h1>
              <p className="text-sm text-gray-600">
                Manage broker accounts and permissions
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={handleCreateBroker} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Broker
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-white rounded-lg border p-3">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search brokers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* Brokers Table */}
        <div className="bg-white rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Specializations</TableHead>
                {isAdmin && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 6}
                    className="text-center py-8"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-gray-600">
                        Loading brokers...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredBrokers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 6}
                    className="text-center py-8"
                  >
                    <p className="text-sm text-gray-600">No brokers found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBrokers.map((broker) => (
                  <TableRow key={broker.id}>
                    <TableCell className="font-medium">
                      {broker.first_name} {broker.last_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{broker.email}</span>
                        </div>
                        {broker.phone && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{broker.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(broker.role)}>
                        {broker.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(broker.status)}>
                        {broker.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {broker.license_number || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {broker.specializations &&
                      Array.isArray(broker.specializations) &&
                      broker.specializations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {broker.specializations.slice(0, 2).map((spec) => (
                            <Badge
                              key={spec}
                              variant="outline"
                              className="text-xs"
                            >
                              {spec}
                            </Badge>
                          ))}
                          {broker.specializations.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{broker.specializations.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditBroker(broker)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(broker)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={broker.id === currentBroker?.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Broker Wizard */}
        <BrokerWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onSubmit={handleWizardSubmit}
          broker={selectedBroker}
          mode={wizardMode}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Broker</AlertDialogTitle>
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
      </div>
    </>
  );
}
