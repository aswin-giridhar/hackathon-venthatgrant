import { useState } from "react";
import { Bell, Menu, Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { useTheme } from "@/hooks/use-theme";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, logoutMutation } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U'; // Default to 'U' for user if no name provided
    
    // If there's a full name, use the first letter of the first name
    if (user?.fullName) {
      return user.fullName.charAt(0).toUpperCase();
    }
    
    // Otherwise use first letter of username or the first two letters if available
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 1); // Just the first letter
  };

  return (
    <header className="sticky top-0 z-40 bg-background border-b">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center flex-1 gap-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar isMobile={true} onLinkClick={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <form className="relative w-full max-w-md flex" onSubmit={(e) => {
            e.preventDefault();
            // Get the search query
            const searchInput = (e.target as HTMLFormElement).querySelector('input')?.value;
            if (searchInput) {
              // Use Link navigation instead of page reload
              window.history.pushState({}, '', `/grant-finder?q=${encodeURIComponent(searchInput)}`);
              
              // Create and dispatch a custom event that the grant-finder page can listen for
              const searchEvent = new CustomEvent('header-search', { 
                detail: { query: searchInput } 
              });
              window.dispatchEvent(searchEvent);
            }
          }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search grants, proposals, reports..." 
                className="pl-10 w-full rounded-r-none"
              />
            </div>
            <Button type="submit" className="rounded-l-none">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-8 w-8 p-0"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {getInitials(user.fullName || user.username)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
