import { Home, Calendar, MapPin, Tag, Users, FileText, DollarSign, Settings as SettingsIcon, Bell, UsersRound, UserCircle, UserPlus, Crown } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

const menuItems = [
  {
    title: "ダッシュボード",
    url: "/team",
    icon: Home,
  },
  {
    title: "スケジュール",
    url: "/team/schedule",
    icon: Calendar,
  },
  {
    title: "活動場所",
    url: "/team/place",
    icon: MapPin,
  },
  {
    title: "カテゴリ",
    url: "/team/category",
    icon: Tag,
  },
  {
    title: "コーチ",
    url: "/team/staffs",
    icon: Users,
  },
  {
    title: "メンバー",
    url: "/team/members",
    icon: UsersRound,
  },
  {
    title: "共有資料",
    url: "/team/information",
    icon: FileText,
  },
  {
    title: "月謝管理",
    url: "/team/billing",
    icon: DollarSign,
  },
  {
    title: "チーム情報",
    url: "/team/information2",
    icon: SettingsIcon,
  },
  {
    title: "LINE通知",
    url: "/team/line",
    icon: Bell,
  },
  {
    title: "サブスクリプション",
    url: "/team/subscription",
    icon: Crown,
  },
  {
    title: "プロフィール設定",
    url: "/team/profile",
    icon: UserCircle,
  },
  {
    title: "メンバー登録",
    url: "/team/invite",
    icon: UserPlus,
  },
];

interface AppSidebarProps {
  teamId?: string;
  teamName?: string;
}

export function AppSidebar({ teamId, teamName }: AppSidebarProps) {
  const [location] = useLocation();
  const { setOpenMobile } = useSidebar();

  // Fetch team info if not provided
  const { data: teams } = useQuery<Array<{ id: string; name: string; teamCode: string }>>({
    queryKey: ["/api/teams"],
    enabled: !teamName && !!teamId,
  });

  const team = teams?.find(t => t.id === teamId);
  const displayTeamName = teamName || team?.name || "チーム";
  const displayTeamCode = team?.teamCode || "---";

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-2">
            <Calendar className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-base md:text-sm" data-testid="text-sidebar-team-name">{displayTeamName}</h2>
            <p className="text-xs text-muted-foreground" data-testid="text-sidebar-team-code">{displayTeamCode}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs md:text-xs">メニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} onClick={handleLinkClick} data-testid={`link-${item.url.slice(1) || 'dashboard'}`}>
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
