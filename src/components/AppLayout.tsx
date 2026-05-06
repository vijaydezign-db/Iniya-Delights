import { useLocation } from 'react-router-dom';
import { Package, Wheat, Calculator, LayoutDashboard, LogOut, Layers } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import iniyaLogo from '@/assets/iniya-logo.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ingredients', label: 'Ingredients', icon: Wheat },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/calculator', label: 'Cost Calculator', icon: Calculator },
  { to: '/combo-packs', label: 'Combo Packs', icon: Layers },
];

function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <div className="p-4 border-b border-sidebar-border">
        {collapsed ? (
          <img src={iniyaLogo} alt="Iniya Delights" className="h-8 w-8 object-contain" />
        ) : (
          <div className="flex items-center gap-2">
            <img src={iniyaLogo} alt="Iniya Delights" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-sm font-bold text-sidebar-primary leading-tight">Iniya Delights</h1>
              <p className="text-[10px] text-sidebar-foreground/60">Internal Costing System</p>
            </div>
          </div>
        )}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ to, label, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild>
                    <NavLink to={to} end className="hover:bg-muted/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <Icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </Sidebar>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b shrink-0">
            <SidebarTrigger className="ml-2" />
          </header>
          <main className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
