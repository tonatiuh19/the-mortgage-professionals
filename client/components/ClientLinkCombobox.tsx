import { useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Link2, Loader2, Plus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createClient,
  searchClientsForPicker,
  type ClientCreateConflict,
} from "@/store/slices/clientsSlice";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

export interface LinkedClientValue {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
}

interface ClientLinkComboboxProps {
  value: LinkedClientValue | null;
  onChange: (client: LinkedClientValue | null) => void;
  /** Prefill create-client form from worksheet fields */
  createDefaults?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  className?: string;
  label?: string;
  allowCreate?: boolean;
}

const createSchema = Yup.object({
  first_name: Yup.string().trim().required("First name is required"),
  last_name: Yup.string().trim().required("Last name is required"),
  email: Yup.string().trim().email("Invalid email").required("Email is required"),
  phone: Yup.string().trim().optional(),
});

export function ClientLinkCombobox({
  value,
  onChange,
  createDefaults,
  className,
  label = "Link client",
  allowCreate = true,
}: ClientLinkComboboxProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { pickerSearchResults, isPickerSearching } = useAppSelector(
    (s) => s.clients,
  );
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [conflict, setConflict] = useState<ClientCreateConflict | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) return;
    debounceRef.current = setTimeout(() => {
      void dispatch(searchClientsForPicker(q));
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, dispatch]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      first_name: createDefaults?.first_name ?? "",
      last_name: createDefaults?.last_name ?? "",
      email: createDefaults?.email ?? "",
      phone: createDefaults?.phone ?? "",
    },
    validationSchema: createSchema,
    onSubmit: async (vals) => {
      setCreating(true);
      try {
        const result = await dispatch(
          createClient({
            first_name: vals.first_name.trim(),
            last_name: vals.last_name.trim(),
            email: vals.email.trim(),
            phone: vals.phone.trim() || undefined,
          }),
        );
        if (createClient.fulfilled.match(result)) {
          const c = result.payload;
          onChange({
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email,
            phone: c.phone ?? null,
          });
          setShowCreate(false);
          setOpen(false);
          setQuery("");
          toast({
            title: "Client created",
            description: `${c.first_name} ${c.last_name} linked.`,
          });
        } else {
          const err = result.payload as ClientCreateConflict | string;
          if (
            typeof err === "object" &&
            err?.conflict?.client_id != null
          ) {
            setConflict(err);
            toast({
              title: "Client already exists",
              description:
                err.hint ||
                err.error ||
                "Link the existing client instead of creating a duplicate.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Could not create client",
              description:
                typeof err === "string"
                  ? err
                  : err?.error || "Create failed",
              variant: "destructive",
            });
          }
        }
      } catch (err) {
        logger.error("[ClientLinkCombobox] createClient failed", err);
        toast({
          title: "Could not create client",
          description: "Unexpected error",
          variant: "destructive",
        });
      } finally {
        setCreating(false);
      }
    },
  });

  if (value) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5">
          <Link2 className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              {value.first_name} {value.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {[value.email, value.phone].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onChange(null)}
            aria-label="Clear client link"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 relative", className)}>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search clients by name, email, phone…"
          className="h-10"
        />
        {isPickerSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border bg-popover shadow-lg max-h-56 overflow-auto">
          {pickerSearchResults.length === 0 && !isPickerSearching ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">
              No clients found.
            </p>
          ) : (
            pickerSearchResults.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/60 border-b last:border-0"
                onClick={() => {
                  onChange({
                    id: c.id,
                    first_name: c.first_name,
                    last_name: c.last_name,
                    email: c.email,
                    phone: c.phone ?? null,
                  });
                  setOpen(false);
                  setQuery("");
                }}
              >
                <p className="font-semibold">
                  {c.first_name} {c.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[c.email, c.phone].filter(Boolean).join(" · ")}
                </p>
              </button>
            ))
          )}
          {allowCreate && (
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary hover:bg-muted/60"
              onClick={() => {
                setShowCreate(true);
                setOpen(false);
                const parts = query.trim().split(/\s+/);
                if (parts.length >= 2 && !createDefaults?.first_name) {
                  void formik.setValues({
                    ...formik.values,
                    first_name: parts[0],
                    last_name: parts.slice(1).join(" "),
                  });
                }
              }}
            >
              <UserPlus className="h-4 w-4" />
              Create new client
            </button>
          )}
        </div>
      )}

      {allowCreate && !showCreate && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Create new client
        </Button>
      )}

      {conflict?.conflict && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-900">
            {conflict.error || "A client with this email or phone already exists"}
          </p>
          <p className="text-xs text-amber-800">
            {conflict.conflict.client_name}
            {conflict.conflict.broker_name
              ? ` · owned by ${conflict.conflict.broker_name}`
              : ""}
            {conflict.hint ? ` — ${conflict.hint}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const c = conflict.conflict;
                onChange({
                  id: c.client_id,
                  first_name: c.client_name.split(/\s+/)[0] || c.client_name,
                  last_name:
                    c.client_name.split(/\s+/).slice(1).join(" ") || "",
                  email: formik.values.email.trim() || "",
                  phone: formik.values.phone.trim() || null,
                });
                setConflict(null);
                setShowCreate(false);
                toast({
                  title: "Linked existing client",
                  description: c.client_name,
                });
              }}
            >
              Link existing client
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setConflict(null)}
            >
              Dismiss
            </Button>
          </div>
          <p className="text-[11px] text-amber-700">
            Ownership is not transferred — this only links the calculator to
            the existing CRM record when you have access.
          </p>
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={formik.handleSubmit}
          className="rounded-xl border bg-card p-4 space-y-3"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Create & link client
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">First name</Label>
              <Input
                name="first_name"
                value={formik.values.first_name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="h-9"
              />
              {formik.touched.first_name && formik.errors.first_name && (
                <p className="text-[11px] text-destructive">
                  {formik.errors.first_name}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last name</Label>
              <Input
                name="last_name"
                value={formik.values.last_name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="h-9"
              />
              {formik.touched.last_name && formik.errors.last_name && (
                <p className="text-[11px] text-destructive">
                  {formik.errors.last_name}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                name="email"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="h-9"
              />
              {formik.touched.email && formik.errors.email && (
                <p className="text-[11px] text-destructive">
                  {formik.errors.email}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                name="phone"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="h-9"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Create & link
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
