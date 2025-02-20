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
import { Link, useLocation, useNavigate } from "react-router-dom";

const menuItems = [
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
    path: "https://t.me/blueskyinvestments",
    external: true,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile, isMobile, openMobile } = useSidebar();
  const [isNavigating, setIsNavigating] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  // Debug logging for state changes
  React.useEffect(() => {
    console.log('Sidebar state changed:', { isMobile, openMobile, isNavigating });
  }, [isMobile, openMobile, isNavigating]);

  const handleTransitionEnd = React.useCallback((e: TransitionEvent) => {
    // Only handle transitions of the sidebar element
    if (e.target === sidebarRef.current && e.propertyName === 'transform') {
      console.log('Sidebar transition ended');
      setIsNavigating(false);
    }
  }, []);

  React.useEffect(() => {
    const sidebar = sidebarRef.current;
    if (sidebar) {
      sidebar.addEventListener('transitionend', handleTransitionEnd);
      return () => {
        sidebar.removeEventListener('transitionend', handleTransitionEnd);
      };
    }
  }, [handleTransitionEnd]);

  const handleNavigation = React.useCallback((path: string, external: boolean = false) => {
    if (external) {
      window.open(path, '_blank', 'noopener,noreferrer');
      return;
    }

    console.log('Navigating to:', path);
    navigate(path);
  }, [navigate]);

  const handleClick = React.useCallback((path: string, external: boolean = false) => {
    if (isNavigating) {
      console.log('Navigation in progress, ignoring click');
      return;
    }

    console.log('Handling click:', { path, external, isMobile });
    
    if (isMobile) {
      setIsNavigating(true);
      setOpenMobile(false);
      
      // Use requestAnimationFrame to ensure the state update has been processed
      requestAnimationFrame(() => {
        handleNavigation(path, external);
      });
    } else {
      handleNavigation(path, external);
    }
  }, [isMobile, setOpenMobile, handleNavigation, isNavigating]);

  // Reset states when route changes
  React.useEffect(() => {
    return () => {
      setIsNavigating(false);
      if (isMobile) {
        setOpenMobile(false);
      }
    };
  }, [location.pathname, isMobile, setOpenMobile]);

  return (
    <Sidebar ref={sidebarRef}>
      <SidebarHeader className="p-4 sm:p-6">
        <div 
          className="flex items-center space-x-3 group cursor-pointer" 
          onClick={() => !isNavigating && handleClick('/')}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:blur-lg transition-all duration-300" />
            <img 
              src="/logo.svg" 
              alt="Bluesky Investments" 
              className="h-8 w-8 sm:h-9 sm:w-9 relative transform group-hover:scale-110 transition-transform duration-300" 
            />
          </div>
          <span className="font-bold text-base sm:text-lg text-sidebar-foreground group-hover:text-primary transition-colors duration-300">
            Bluesky
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent 
        className={`px-2 sm:px-4 transition-transform duration-300 ease-in-out ${
          isNavigating ? 'transform translate-x-full' : ''
        }`}
      >
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs uppercase tracking-wider text-sidebar-foreground/70">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = !item.external && location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="group relative"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => !isNavigating && handleClick(item.path, item.external)}
                        onKeyDown={(e) => {
                          if (!isNavigating && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            handleClick(item.path, item.external);
                          }
                        }}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-300 hover:bg-sidebar-accent active:bg-sidebar-accent/80 group-hover:shadow-md cursor-pointer ${
                          isNavigating ? 'pointer-events-none opacity-50 transform translate-x-2' : ''
                        }`}
                      >
                        <div className="relative">
                          <div className={`absolute inset-0 rounded-full ${
                            isActive ? 'bg-primary/20' : 'bg-transparent'
                          } blur-sm group-hover:blur-md transition-all duration-300`} />
                          <item.icon className="h-5 w-5 relative text-sidebar-foreground/70 group-hover:text-primary transition-colors duration-300" />
                        </div>
                        <span className="text-[15px] text-sidebar-foreground/90 group-hover:text-primary transition-colors duration-300">
                          {item.title}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}