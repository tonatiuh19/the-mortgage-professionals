import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  selectIsClientAuthenticated,
  selectClient,
  logoutClient,
} from "@/store/slices/clientAuthSlice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const location = useLocation();
  const dispatch = useAppDispatch();
  const isClientAuthenticated = useAppSelector(selectIsClientAuthenticated);
  const client = useAppSelector(selectClient);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await dispatch(logoutClient());
  };

  const navLinks = [
    { name: "Purchase", href: "/calculator?type=purchase" },
    { name: "Refinance", href: "/calculator?type=refinance" },
    { name: "Loan Options", href: "/loan-options" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  const isHome = location.pathname === "/";

  return (
    <nav className="sticky top-4 z-50 w-[95%] mx-auto max-w-7xl">
      <div
        className={cn(
          "relative rounded-2xl bg-white/10 p-[1px] shadow-2xl backdrop-blur-2xl transition-all duration-300",
          isHome
            ? "border border-white/20 hover:border-white/40"
            : "border-transparent",
        )}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
        <div className="relative flex h-16 items-center justify-between px-6 rounded-2xl bg-background/40">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center space-x-2 transition-transform hover:scale-105"
            >
              <img
                src="https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png"
                alt="The Mortgage Professionals"
                className="h-10 w-auto"
              />
            </Link>
            <div className="hidden md:flex md:ml-10 md:gap-8">
              {navLinks.map((link) => {
                const [linkPath, linkQuery] = link.href.split("?");
                const isActive =
                  location.pathname === linkPath &&
                  (!linkQuery || location.search === `?${linkQuery}`);
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      "relative text-sm font-semibold transition-all hover:text-primary py-2",
                      isActive
                        ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-primary after:rounded-full"
                        : "text-muted-foreground",
                    )}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              <a href="tel:(562)337-0000">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-semibold hover:bg-white/10 transition-colors"
                >
                  (562) 337-0000
                </Button>
              </a>
              {!isClientAuthenticated && (
                <>
                  <Link to="/client-login">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="font-semibold hover:bg-white/10 transition-colors gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      My Applications
                    </Button>
                  </Link>
                  <Link to="/apply">
                    <Button
                      size="sm"
                      className="font-bold shadow-lg shadow-primary/20 px-6 rounded-xl hover:scale-105 active:scale-95 transition-all"
                    >
                      Get Pre-Approved
                    </Button>
                  </Link>
                </>
              )}
              {isClientAuthenticated && client && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 hover:bg-white/10 transition-colors"
                    >
                      <Avatar className="h-7 w-7 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {client.first_name.charAt(0)}
                          {client.last_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold">{client.first_name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/portal" className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/portal/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowLogoutConfirm(true)}
                      className="cursor-pointer text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <button
              className="inline-flex items-center justify-center rounded-xl p-2 text-muted-foreground hover:bg-white/10 transition-colors md:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu with glass effect */}
      {isOpen && (
        <div
          className={cn(
            "mt-2 rounded-2xl bg-background/60 p-2 shadow-2xl backdrop-blur-2xl md:hidden animate-in slide-in-from-top-2 duration-300",
            isHome ? "border border-white/20" : "border-transparent",
          )}
        >
          <div className="container space-y-1 pb-3 pt-2">
            {navLinks.map((link) => {
              const [linkPath, linkQuery] = link.href.split("?");
              const isActive =
                location.pathname === linkPath &&
                (!linkQuery || location.search === `?${linkQuery}`);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "block rounded-xl px-3 py-3 text-base font-semibold transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-white/5",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              );
            })}
            <div className="mt-4 flex flex-col gap-2 px-1 pb-2">
              <a href="tel:(562)337-0000" className="w-full">
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-white/20 hover:bg-white/10"
                >
                  (562) 337-0000
                </Button>
              </a>
              {!isClientAuthenticated && (
                <>
                  <Link to="/client-login" className="w-full">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-primary/20 hover:bg-primary/5 gap-2"
                      onClick={() => setIsOpen(false)}
                    >
                      <FileText className="h-4 w-4" />
                      My Applications
                    </Button>
                  </Link>
                  <Link to="/apply">
                    <Button className="w-full rounded-xl font-bold shadow-lg shadow-primary/20">
                      Get Pre-Approved
                    </Button>
                  </Link>
                </>
              )}
              {isClientAuthenticated && client && (
                <>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                    <Avatar className="h-8 w-8 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {client.first_name.charAt(0)}
                        {client.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {client.first_name} {client.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {client.email}
                      </p>
                    </div>
                  </div>
                  <Link to="/portal" className="w-full">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-primary/20 hover:bg-primary/5 gap-2"
                      onClick={() => setIsOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Link to="/portal/profile" className="w-full">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-primary/20 hover:bg-primary/5 gap-2"
                      onClick={() => setIsOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-red-200 hover:bg-red-50 text-red-600 gap-2"
                    onClick={() => {
                      setIsOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You'll need to log in again to
              continue.
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
    </nav>
  );
};

export default Navbar;
