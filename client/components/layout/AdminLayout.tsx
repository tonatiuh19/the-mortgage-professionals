import React, { useState } from "react";
import GlobalVoiceManager from "@/components/GlobalVoiceManager";
import {
  LayoutDashboard,
  Kanban,
  Users,
  CheckCircle2,
  Megaphone,
  Briefcase,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  Mail,
  MessageCircle,
  FileText,
  History,
  TrendingUp,
  Shield,
  Bell,
  UserCog,
  Lock,
  AlarmClock,
  Menu,
  X,
  MessageSquare,
  CalendarDays,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { IS_DEV } from "@/lib/env";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout, initAdminSession } from "@/store/slices/brokerAuthSlice";
import { selectSectionControlsMap } from "@/store/slices/adminSectionControlsSlice";
import { useNavigate, useLocation } from "react-router-dom";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, sessionToken, isAuthenticated } = useAppSelector(
    (state) => state.brokerAuth,
  );
  const sectionControlsMap = useAppSelector(selectSectionControlsMap);
  const { isLoading: isLoadingControls, isInitialized: controlsInitialized } =
    useAppSelector((s) => s.adminSectionControls);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!sessionToken) {
      navigate("/broker-login");
    }
  }, [sessionToken, navigate]);

  // Single bootstrap call — validates session, loads profile + section controls
  React.useEffect(() => {
    if (sessionToken) {
      dispatch(initAdminSession());
    }
  }, [dispatch, sessionToken]);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await dispatch(logout());
    navigate("/broker-login");
  };

  const isPartner = user?.role === "broker";

  const menuItems = [
    {
      id: "dashboard",
      label: "Home",
      icon: <LayoutDashboard className="h-4 w-4" />,
      path: "/admin",
    },
    {
      id: "pipeline",
      label: "Pipeline",
      icon: <Kanban className="h-4 w-4" />,
      path: "/admin/pipeline",
    },
    {
      id: "clients",
      label: "Clients & Leads",
      icon: <Users className="h-4 w-4" />,
      path: "/admin/clients",
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: <CheckCircle2 className="h-4 w-4" />,
      path: "/admin/tasks",
      hidden: isPartner,
    },
    {
      id: "documents",
      label: "Documents",
      icon: <Briefcase className="h-4 w-4" />,
      path: "/admin/documents",
      hidden: isPartner,
    },
    {
      id: "scheduler",
      label: "Calendar",
      icon: <CalendarDays className="h-4 w-4" />,
      path: "/admin/calendar",
    },
    {
      id: "conversations",
      label: "Conversations",
      icon: <MessageCircle className="h-4 w-4" />,
      path: "/admin/conversations",
      hidden: isPartner,
      forceDisabled: true,
      tooltipMessage: "Coming Soon",
    },
    {
      id: "reminder-flows",
      label: "Reminder Flows",
      icon: <AlarmClock className="h-4 w-4" />,
      path: "/admin/reminder-flows",
      hidden: isPartner,
    },
    {
      id: "communication-templates",
      label: "Message Templates",
      icon: <FileText className="h-4 w-4" />,
      path: "/admin/communication-templates",
      hidden: isPartner,
    },
    {
      id: "reports",
      label: "Reports & Analytics",
      icon: <TrendingUp className="h-4 w-4" />,
      path: "/admin/reports",
      hidden: isPartner,
    },
    {
      id: "brokers",
      label: "People Management",
      icon: <UserCog className="h-4 w-4" />,
      path: "/admin/brokers",
      hidden: isPartner,
    },
    {
      id: "contact-submissions",
      label: "Contact Messages",
      icon: <MessageSquare className="h-4 w-4" />,
      path: "/admin/contact-submissions",
      hidden: isPartner,
    },
    {
      id: "income-calculator",
      label: "Income Calculator",
      icon: <Calculator className="h-4 w-4" />,
      path: "/admin/income-calculator",
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      path: "/admin/settings",
      hidden: isPartner,
    },
  ];

  const isDev = IS_DEV;

  // Build effective menu items with disabled state resolved from DB
  // In development all sections are unlocked regardless of DB controls
  const effectiveMenuItems = menuItems
    .filter((item) => !(item as any).hidden)
    .map((item) => {
      const ctrl = sectionControlsMap[item.id];
      const forceDisabled = (item as any).forceDisabled ?? false;
      return {
        ...item,
        disabled:
          forceDisabled || (isDev ? false : ctrl ? ctrl.is_disabled : false),
        tooltipMessage:
          (item as any).tooltipMessage ??
          ctrl?.tooltip_message ??
          "Coming Soon",
      };
    });

  // Route guard: redirect away from disabled sections once controls are loaded
  React.useEffect(() => {
    if (!controlsInitialized || isLoadingControls) return;
    const isOnDisabledRoute = effectiveMenuItems.some(
      (item) =>
        item.disabled &&
        item.path !== "/admin" &&
        (location.pathname === item.path ||
          location.pathname.startsWith(item.path + "/")),
    );
    if (isOnDisabledRoute) {
      navigate("/admin", { replace: true });
    }
  }, [
    location.pathname,
    controlsInitialized,
    isLoadingControls,
    effectiveMenuItems,
    navigate,
  ]);

  // Shared menu renderer used by both desktop sidebar and mobile Sheet
  const renderMenuItems = (onItemClick?: () => void) =>
    effectiveMenuItems.map((item) => {
      const menuButton = (
        <Button
          key={item.id}
          variant={location.pathname === item.path ? "secondary" : "ghost"}
          className={cn(
            "w-full gap-3 justify-start",
            location.pathname === item.path
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "",
            item.disabled
              ? "opacity-60 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
              : "",
          )}
          onClick={() => {
            if (!item.disabled) {
              navigate(item.path);
              onItemClick?.();
            }
          }}
          aria-disabled={item.disabled}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.disabled && <Lock className="h-3.5 w-3.5 ml-auto" />}
        </Button>
      );

      if (!item.disabled) return menuButton;

      return (
        <Tooltip key={item.id} delayDuration={250}>
          <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.tooltipMessage}</p>
          </TooltipContent>
        </Tooltip>
      );
    });

  return (
    <div className="flex h-screen bg-muted/20 overflow-hidden">
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-background border-b shadow-sm">
        <img
          src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png"
          alt="The Mortgage Professionals"
          className="h-8 w-auto"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          className="h-9 w-9"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Navigation Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="flex flex-row items-center justify-between px-4 h-14 border-b shrink-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <img
              src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png"
              alt="The Mortgage Professionals"
              className="h-9 w-auto"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {!controlsInitialized
              ? Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-9 rounded-md bg-muted animate-pulse"
                  />
                ))
              : renderMenuItems(() => setMobileMenuOpen(false))}
          </div>

          {/* Mobile User Section */}
          <div className="border-t p-4 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  navigate("/admin/profile");
                  setMobileMenuOpen(false);
                }}
                className="focus:outline-none"
              >
                <Avatar className="h-9 w-9 ring-2 ring-primary/20 cursor-pointer hover:ring-primary/50 transition-all">
                  <AvatarImage
                    src={user?.avatar_url ?? undefined}
                    alt="Profile"
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.first_name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate("/admin/profile");
                  setMobileMenuOpen(false);
                }}
                className="flex-1 min-w-0 text-left hover:opacity-80"
              >
                <p className="text-sm font-medium truncate">
                  {user ? `${user.first_name} ${user.last_name}` : "Admin User"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role === "admin" ? "Mortgage Banker" : "Partner"}
                </p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setShowLogoutConfirm(true);
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sidebar */}
      <aside
        className={cn(
          "hidden border-r bg-background md:flex md:flex-col transition-all duration-300 h-screen",
          sidebarCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo & Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {!sidebarCollapsed ? (
            <>
              <img
                src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png"
                alt="The Mortgage Professionals"
                className="h-10 w-auto"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-8 w-8 hover:bg-primary/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <img
                src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/favicon/favicon.ico"
                alt="The Mortgage Professionals"
                className="h-6 w-auto cursor-pointer"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
            </div>
          )}
        </div>

        {/* Menu Items */}
        <div className="flex-1 space-y-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {!controlsInitialized
            ? Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-9 rounded-md bg-muted animate-pulse",
                    sidebarCollapsed ? "w-8 mx-auto" : "w-full",
                  )}
                />
              ))
            : effectiveMenuItems.map((item) => {
                const menuButton = (
                  <Button
                    key={item.id}
                    variant={
                      location.pathname === item.path ? "secondary" : "ghost"
                    }
                    className={cn(
                      "w-full gap-3",
                      sidebarCollapsed
                        ? "justify-center px-2"
                        : "justify-start",
                      location.pathname === item.path
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "",
                      item.disabled
                        ? "opacity-60 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                        : "",
                    )}
                    onClick={() => {
                      if (!item.disabled) navigate(item.path);
                    }}
                    aria-disabled={item.disabled}
                    title={
                      sidebarCollapsed && !item.disabled
                        ? item.label
                        : undefined
                    }
                  >
                    {item.icon}
                    {!sidebarCollapsed && (
                      <>
                        <span>{item.label}</span>
                        {item.disabled && (
                          <Lock className="h-3.5 w-3.5 ml-auto" />
                        )}
                      </>
                    )}
                    {sidebarCollapsed && item.disabled && (
                      <Lock className="h-3.5 w-3.5 absolute top-1.5 right-1.5" />
                    )}
                  </Button>
                );

                if (!item.disabled) {
                  return menuButton;
                }

                return (
                  <Tooltip key={item.id} delayDuration={250}>
                    <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
                    <TooltipContent side={sidebarCollapsed ? "right" : "top"}>
                      <p>{item.tooltipMessage}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
        </div>

        {/* Dev mode badge */}
        {isDev && (
          <div
            className={cn(
              "mx-4 mb-2 rounded-md border border-yellow-400/40 bg-yellow-400/10 px-2 py-1 text-center",
              sidebarCollapsed ? "px-0" : "",
            )}
          >
            {sidebarCollapsed ? (
              <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">
                DEV
              </span>
            ) : (
              <p className="text-[11px] font-semibold text-yellow-600 dark:text-yellow-400">
                🛠 Dev mode — all sections unlocked
              </p>
            )}
          </div>
        )}

        {/* User Section */}
        <div className="border-t p-4">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 group">
              <button
                type="button"
                onClick={() => navigate("/admin/profile")}
                className="focus:outline-none"
              >
                <Avatar className="h-9 w-9 ring-2 ring-primary/20 cursor-pointer hover:ring-primary/50 transition-all">
                  <AvatarImage
                    src={user?.avatar_url ?? undefined}
                    alt="Profile"
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.first_name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/profile")}
                className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
              >
                <p className="text-sm font-medium truncate">
                  {user ? `${user.first_name} ${user.last_name}` : "Admin User"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role === "admin" ? "Mortgage Banker" : "Partner"}
                </p>
              </button>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => setShowLogoutConfirm(true)}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  <p>Sign Out</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={user?.avatar_url ?? undefined}
                        alt="Profile"
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user?.first_name?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <div className="flex items-center gap-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user?.avatar_url ?? undefined}
                        alt="Profile"
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.first_name?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user
                          ? `${user.first_name} ${user.last_name}`
                          : "Admin User"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {user?.role === "admin" ? "Mortgage Banker" : "Partner"}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2"
                    onClick={() => navigate("/admin/profile")}
                  >
                    <UserCog className="h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                    onClick={() => setShowLogoutConfirm(true)}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen pt-14 md:pt-0">
        {!controlsInitialized ? (
          <div className="flex flex-col gap-4 p-6 h-full">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
              <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
              <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
            </div>
            {/* Card row skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
            {/* Content block skeletons */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 rounded-xl bg-muted animate-pulse" />
              <div className="rounded-xl bg-muted animate-pulse" />
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You'll need to log in again to
              access your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <GlobalVoiceManager />
    </div>
  );
};

export default AdminLayout;
