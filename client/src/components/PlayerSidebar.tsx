import { CheckSquare, Calendar as CalendarIcon, FileText, Mail, User, UsersRound, Users } from "lucide-react";
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
    title: "カレンダー",
    url: "/",
    icon: CalendarIcon,
  },
  {
    title: "出欠管理",
    url: "/attendance",
    icon: CheckSquare,
  },
  {
    title: "メンバー",
    url: "/members",
    icon: UsersRound,
  },
  {
    title: "コーチ",
    url: "/coaches",
    icon: Users,
  },
  {
    title: "共有資料",
    url: "/information",
    icon: FileText,
  },
  {
    title: "プロフィール管理",
    url: "/profile",
    icon: User,
  },
  {
    title: "問い合わせ",
    url: "/contact",
    icon: Mail,
  },
];

interface PlayerSidebarProps {
  teamName: string;
}

export function PlayerSidebar({ teamName }: PlayerSidebarProps) {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 shadow-lg">
            <CalendarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {teamName}
            </h2>
            <p className="text-xs text-muted-foreground font-medium">選手ポータル</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-2 mb-1">
            メニュー
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-player-${item.title}`}>
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.title}</span>
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
