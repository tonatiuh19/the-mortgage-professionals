import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchRoleSectionPermissions,
  selectRolePermissionsMap,
  setPermission,
  updateRoleSectionPermissions,
} from "@/store/slices/roleSectionPermissionsSlice";

const ROLES = [
  { id: "broker", label: "Partner" },
  { id: "loan_officer", label: "Loan Officer" },
  { id: "loan_processor", label: "Processor" },
  { id: "realtor", label: "Realtor" },
  { id: "buyers_agent", label: "Buyer's Agent" },
  { id: "listing_agent", label: "Listing Agent" },
];

const SECTIONS = [
  { id: "dashboard", label: "Home" },
  { id: "pipeline", label: "Pipeline" },
  { id: "clients", label: "Clients" },
  { id: "tasks", label: "Tasks" },
  { id: "documents", label: "Documents" },
  { id: "scheduler", label: "Calendar" },
  { id: "conversations", label: "Conversations" },
  { id: "email", label: "Email" },
  { id: "reports", label: "Reports" },
  { id: "income-calculator", label: "Income Calculator" },
];

/** Admin matrix controlling which sidebar sections each non-admin role sees. */
export function RolePermissionsPanel() {
  const dispatch = useAppDispatch();
  const map = useAppSelector(selectRolePermissionsMap);
  const permissions = useAppSelector((s) => s.roleSectionPermissions.permissions);
  const isSaving = useAppSelector((s) => s.roleSectionPermissions.isSaving);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    dispatch(fetchRoleSectionPermissions());
  }, [dispatch]);

  const handleSave = async () => {
    try {
      await dispatch(
        updateRoleSectionPermissions({
          permissions: permissions.map((p) => ({
            broker_role: p.broker_role,
            section_id: p.section_id,
            is_visible: p.is_visible,
          })),
        }),
      ).unwrap();
      setDirty(false);
      toast({ title: "Saved", description: "Role visibility updated." });
    } catch (err) {
      toast({
        title: "Could not save",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Section</th>
              {ROLES.map((r) => (
                <th key={r.id} className="px-2 py-2 text-center font-medium">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((section) => (
              <tr key={section.id} className="border-b border-border/40">
                <td className="py-2 pr-3 font-medium">{section.label}</td>
                {ROLES.map((role) => (
                  <td key={role.id} className="px-2 py-2 text-center">
                    <Switch
                      aria-label={`${section.label} for ${role.label}`}
                      checked={map[`${role.id}:${section.id}`] !== false}
                      onCheckedChange={(is_visible) => {
                        setDirty(true);
                        dispatch(
                          setPermission({
                            broker_role: role.id,
                            section_id: section.id,
                            is_visible,
                          }),
                        );
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex justify-end border-t border-border/40 pt-5">
        <Button disabled={!dirty || isSaving} onClick={handleSave}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
