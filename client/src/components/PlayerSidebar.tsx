import { CheckSquare, Calendar as CalendarIcon, FileText, User, UsersRound, Users, Activity } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import type { ActivityLog, Category } from "@shared/schema";

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
];

interface PlayerSidebarProps {
  teamName: string;
  teamId: string;
}

// Helper function to get time ago text
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "たった今";
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

export function PlayerSidebar({ teamName, teamId }: PlayerSidebarProps) {
  const [location] = useLocation();
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories", teamId],
    enabled: !!teamId,
  });

  // Fetch activity logs
  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs", teamId],
    enabled: !!teamId,
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 shadow-lg">
            <CalendarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base md:text-base bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {teamName}
            </h2>
            <p className="text-xs text-muted-foreground font-medium">TEAMO</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs md:text-xs font-semibold text-muted-foreground px-2 mb-1">
            メニュー
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} onClick={handleLinkClick} data-testid={`link-player-${item.title}`}>
                      <item.icon className="h-5 w-5 md:h-4 md:w-4" />
                      <span className="font-medium text-base md:text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs md:text-xs font-semibold text-muted-foreground px-2 mb-2 flex items-center gap-2">
            <Activity className="h-3 w-3" />
            タイムライン
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-1.5 px-2">
              {activityLogs.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-4">
                  更新履歴がここに表示されます
                </div>
              ) : (
                activityLogs.slice(0, 5).map((log) => {
                  const timeAgo = getTimeAgo(new Date(log.createdAt));
                  const logCategoryIds = log.categoryIds || [];
                  const categoryNames = logCategoryIds.map(catId => {
                    const category = categories.find(c => c.id === catId);
                    return category?.name || "";
                  }).filter(name => name !== "");
                  
                  return (
                    <div 
                      key={log.id} 
                      className="p-1.5 rounded-lg bg-muted/30 hover-elevate h-7 flex items-center overflow-hidden"
                      data-testid={`activity-log-${log.id}`}
                    >
                      <div className="text-xs flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="truncate">{log.description}</span>
                        {categoryNames.map((name, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                            {name}
                          </Badge>
                        ))}
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
