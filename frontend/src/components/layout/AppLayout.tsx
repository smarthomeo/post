import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Toaster } from "@/components/ui/toaster";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useUser } from "@/hooks/use-user";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <div className="flex min-h-screen flex-col">
            <header className="border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <ThemeToggle />
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/profile">
                  <UserAvatar username={user?.username || ''} size="sm" />
                  <span className="sr-only">Profile</span>
                </Link>
              </Button>
            </header>
            <main className="flex-1 p-4">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}