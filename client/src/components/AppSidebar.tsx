import { Home, Calendar, MapPin, Tag, Users, Shield } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

const menuItems = [
  {
    title: "ダッシュボード",
    url: "/",
    icon: Home,
  },
  {
    title: "スケジュール",
    url: "/schedules",
    icon: Calendar,
  },
  {
    title: "活動場所",
    url: "/venues",
    icon: MapPin,
  },
  {
    title: "カテゴリ",
    url: "/categories",
    icon: Tag,
  },
  {
    title: "コーチ",
    url: "/coaches",
    icon: Users,
  },
  {
    title: "チーム管理",
    url: "/teams",
    icon: Shield,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-2">
            <Calendar className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">スポーツチーム</h2>
            <p className="text-xs text-muted-foreground">管理システム</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.url.slice(1) || 'dashboard'}`}>
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
