import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, Shield, UserCog } from "lucide-react";

export function AdminSidebar() {
  const [location] = useLocation();
  const { setOpenMobile } = useSidebar();

  const menuItems = [
    {
      title: "ダッシュボード",
      url: "/admins",
      icon: LayoutDashboard,
    },
    {
      title: "チーム一覧",
      url: "/admins/teams",
      icon: Users,
    },
    {
      title: "管理者アカウント",
      url: "/admins/accounts",
      icon: UserCog,
    },
  ];

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-base md:text-sm">
            <Shield className="h-5 w-5" />
            管理者メニュー
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-${item.url.split('/').pop()}`}
                  >
                    <Link href={item.url} onClick={handleLinkClick}>
                      <item.icon className="h-5 w-5 md:h-4 md:w-4" />
                      <span className="text-base md:text-sm">{item.title}</span>
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
