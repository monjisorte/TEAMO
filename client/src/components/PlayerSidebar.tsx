import { CheckSquare, Calendar as CalendarIcon, FileText, Mail, Settings as SettingsIcon } from "lucide-react";
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
    title: "出欠管理",
    url: "/player/attendance",
    icon: CheckSquare,
  },
  {
    title: "カレンダー",
    url: "/player/calendar",
    icon: CalendarIcon,
  },
  {
    title: "共有資料",
    url: "/player/documents",
    icon: FileText,
  },
  {
    title: "問い合わせ",
    url: "/player/contact",
    icon: Mail,
  },
  {
    title: "設定",
    url: "/player/settings",
    icon: SettingsIcon,
  },
];

export function PlayerSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-2">
            <CalendarIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">選手ポータル</h2>
            <p className="text-xs text-muted-foreground">スケジュール管理</p>
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
                    <Link href={item.url} data-testid={`link-player-${item.title}`}>
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
