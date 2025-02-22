import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { BarChart3, LineChart, Users, UserCircle2, LifeBuoy } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface MenuItem {
  title: string;
  icon: React.ComponentType;
  path: string;
}

const menuItems: MenuItem[] = [
  {
    title: "Portfolio",
    icon: BarChart3,
    path: "/dashboard",
  },
  {
    title: "Forex Trading",
    icon: LineChart,
    path: "/forex",
  },
  {
    title: "Referrals",
    icon: Users,
    path: "/referrals",
  },
  {
    title: "Profile",
    icon: UserCircle2,
    path: "/profile",
  },
  {
    title: "Support",
    icon: LifeBuoy,
    path: "/support",
  },
];

export function AppSidebar() {
  const location = useLocation();
  const sidebar = useSidebar();

  const handleNavigation = () => {
    if (sidebar.isMobile) {
      sidebar.setOpenMobile(false);
    } else if (sidebar.open) {
      sidebar.setOpen(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="p-4">
          <h2 className="text-lg font-semibold">BlueSky Investments</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                  >
                    <Link 
                      to={item.path} 
                      className="flex items-center gap-2"
                      onClick={handleNavigation}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}