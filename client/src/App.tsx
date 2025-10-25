import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import SchedulesPage from "@/pages/SchedulesPage";
import VenuesPage from "@/pages/VenuesPage";
import CategoriesPage from "@/pages/CategoriesPage";
import CoachesPage from "@/pages/CoachesPage";
import RegisterPage from "@/pages/RegisterPage";
import TeamInfoPage from "@/pages/TeamInfoPage";
import DocumentsPage from "@/pages/DocumentsPage";
import TuitionPage from "@/pages/TuitionPage";
import LineNotificationsPage from "@/pages/LineNotificationsPage";
import InvitePage from "@/pages/InvitePage";
import PlayerLogin from "@/pages/PlayerLogin";
import PasswordReset from "@/pages/PasswordReset";
import PlayerAttendancePage from "@/pages/PlayerAttendancePage";
import PlayerCalendarPage from "@/pages/PlayerCalendarPage";
import PlayerDocumentsPage from "@/pages/PlayerDocumentsPage";
import PlayerProfilePage from "@/pages/PlayerProfilePage";
import PlayerMembersPage from "@/pages/player/PlayerMembersPage";
import PlayerCoachesPage from "@/pages/player/PlayerCoachesPage";
import CoachLogin from "@/pages/CoachLogin";
import MembersPage from "@/pages/MembersPage";
import CoachProfilePage from "@/pages/CoachProfilePage";
import AdminLogin from "@/pages/AdminLogin";
import AdminSetup from "@/pages/AdminSetup";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminTeams from "@/pages/admin/AdminTeams";
import AdminSports from "@/pages/admin/AdminSports";
import AdminAccounts from "@/pages/admin/AdminAccounts";
import { PlayerSidebar } from "@/components/PlayerSidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, ChevronDown, Users } from "lucide-react";
import { getFullName } from "@/lib/nameUtils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

interface PlayerData {
  id: string;
  lastName: string;
  firstName: string;
  email: string;
  teamId: string;
  lastNameKana?: string;
  firstNameKana?: string;
}

interface CoachData {
  id: string;
  lastName: string;
  firstName: string;
  email: string;
  teamId: string;
  lastNameKana?: string;
  firstNameKana?: string;
  photoUrl?: string;
  bio?: string;
  position?: string;
  role?: string;
}

interface AdminData {
  id: string;
  name: string;
  email: string;
}

function PlayerPortalContent({ playerId, onLogout }: { playerId: string; onLogout: () => void }) {
  // Set page title for player portal
  useEffect(() => {
    document.title = "TEAMO【ティーモ】 クラブ運営サポートサイト";
  }, []);

  // Fetch latest player data from server
  const { data: player, isLoading: playerLoading, isError } = useQuery<PlayerData>({
    queryKey: [`/api/student/${playerId}`],
    enabled: !!playerId,
    retry: false,
  });

  // Update localStorage when player data is fetched
  useEffect(() => {
    if (player) {
      localStorage.setItem("playerData", JSON.stringify(player));
    }
  }, [player]);

  // If player data fetch fails (404, etc.), log out
  useEffect(() => {
    if (isError) {
      console.error("Failed to fetch player data, logging out");
      onLogout();
    }
  }, [isError, onLogout]);

  // Fetch team info
  const { data: teams } = useQuery<Array<{ id: string; name: string; teamCode: string }>>({
    queryKey: ["/api/teams"],
    enabled: !!player?.teamId,
  });

  // Fetch approved siblings for account switching
  const { data: siblings = [] } = useQuery<PlayerData[]>({
    queryKey: [`/api/siblings/${playerId}`],
    enabled: !!playerId,
  });

  const team = teams?.find(t => t.id === player?.teamId);
  const teamName = team?.name || "チーム";
  const teamCode = team?.teamCode || "";

  // Handle sibling account switch
  const handleSwitchToSibling = (sibling: PlayerData) => {
    localStorage.setItem("playerData", JSON.stringify(sibling));
    window.location.reload();
  };

  if (playerLoading || !player) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <PlayerSidebar teamName={teamName} teamCode={teamCode} teamId={player.teamId} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-2 md:px-8 py-4 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger data-testid="button-player-sidebar-toggle" />
              {siblings.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 md:gap-3 hover-elevate active-elevate-2 rounded-lg px-3 md:px-4 py-2.5 text-left border-2 border-primary/20 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/30 dark:to-purple-950/30" data-testid="button-sibling-switcher">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h1 className="text-base md:text-lg font-semibold" data-testid="text-player-name">
                          {getFullName(player.lastName, player.firstName)}さん
                        </h1>
                        <p className="text-xs text-muted-foreground truncate hidden md:block">{player.email}</p>
                      </div>
                      <Badge variant="secondary" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white flex-shrink-0">
                        <ChevronDown className="w-4 h-4" />
                      </Badge>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-80">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        アカウントを切り替え
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        兄弟アカウントに切り替えられます
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    {siblings.map((sibling) => (
                      <DropdownMenuItem 
                        key={sibling.id} 
                        onClick={() => handleSwitchToSibling(sibling)}
                        data-testid={`menu-item-sibling-${sibling.id}`}
                        className="px-3 py-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{getFullName(sibling.lastName, sibling.firstName)}さん</p>
                            <p className="text-xs text-muted-foreground truncate">{sibling.email}</p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-base md:text-lg font-semibold" data-testid="text-player-name">
                      {getFullName(player.lastName, player.firstName)}さん
                    </h1>
                    <p className="text-xs text-muted-foreground hidden md:block">{player.email}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button 
                variant="outline" 
                size="sm"
                onClick={onLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">ログアウト</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8 pb-16 md:pb-24">
            <Switch>
              <Route path="/attendance">
                {() => <PlayerAttendancePage playerId={player.id} teamId={player.teamId} />}
              </Route>
              <Route path="/members">
                {() => <PlayerMembersPage teamId={player.teamId} />}
              </Route>
              <Route path="/coaches">
                {() => <PlayerCoachesPage teamId={player.teamId} />}
              </Route>
              <Route path="/information">
                {() => <PlayerDocumentsPage teamId={player.teamId} />}
              </Route>
              <Route path="/profile">
                {() => <PlayerProfilePage playerId={player.id} teamId={player.teamId} />}
              </Route>
              <Route path="/">
                {() => <PlayerCalendarPage playerId={player.id} teamId={player.teamId} />}
              </Route>
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function PlayerPortal() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedPlayer = localStorage.getItem("playerData");
    if (savedPlayer) {
      const playerData = JSON.parse(savedPlayer);
      setPlayerId(playerData.id);
    }
  }, []);

  const handleLoginSuccess = (playerData: PlayerData) => {
    localStorage.setItem("playerData", JSON.stringify(playerData));
    setPlayerId(playerData.id);
    setLocation("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("playerData");
    setPlayerId(null);
    setLocation("/");
  };

  if (!playerId) {
    return <PlayerLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <PlayerPortalContent playerId={playerId} onLogout={handleLogout} />;
}

function CoachPortalContent({ coachId, onLogout }: { coachId: string; onLogout: () => void }) {
  // Set page title for coach portal
  useEffect(() => {
    document.title = "TEAMO：コーチモード";
  }, []);

  // Fetch latest coach data from server
  const { data: coach, isLoading: coachLoading, error: coachError } = useQuery<CoachData>({
    queryKey: [`/api/coach/${coachId}`],
    enabled: !!coachId,
    retry: false,
  });

  // If coach not found (404 or other error), clear localStorage and logout
  useEffect(() => {
    if (coachError) {
      console.error("コーチが見つかりません。ログアウトします。");
      onLogout();
    }
  }, [coachError, onLogout]);

  // Fetch team info
  const { data: teams } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/teams"],
    enabled: !!coach?.teamId,
  });

  const team = teams?.find(t => t.id === coach?.teamId);
  const teamName = team?.name || "チーム";

  if (coachLoading || !coach) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
  };

  // プロフィール設定の姓名を優先的に使用
  const displayName = getFullName(coach.lastName, coach.firstName);

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar teamId={coach.teamId} teamName={teamName} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-2 md:px-8 py-4 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div>
                <h1 className="text-lg font-semibold" data-testid="text-coach-name">
                  {displayName}さん
                </h1>
                <p className="text-xs text-muted-foreground">{coach.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button 
                variant="outline" 
                size="sm"
                onClick={onLogout}
                data-testid="button-coach-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8 pb-16 md:pb-24">
            <CoachRouter teamId={coach.teamId} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function CoachPortal() {
  const [coachId, setCoachId] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedCoach = localStorage.getItem("coachData");
    if (savedCoach) {
      const coachData = JSON.parse(savedCoach);
      setCoachId(coachData.id);
    }
  }, []);

  const handleLoginSuccess = (coachData: CoachData) => {
    localStorage.setItem("coachData", JSON.stringify(coachData));
    setCoachId(coachData.id);
    setLocation("/team");
  };

  const handleLogout = () => {
    localStorage.removeItem("coachData");
    setCoachId(null);
    setLocation("/login");
  };

  if (!coachId) {
    return <CoachLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <CoachPortalContent coachId={coachId} onLogout={handleLogout} />;
}

function CoachRouter({ teamId }: { teamId: string }) {
  return (
    <Switch>
      <Route path="/team" component={HomePage} />
      <Route path="/team/schedule" component={SchedulesPage} />
      <Route path="/team/place" component={VenuesPage} />
      <Route path="/team/category" component={CategoriesPage} />
      <Route path="/team/staffs" component={CoachesPage} />
      <Route path="/team/members">
        {() => <MembersPage teamId={teamId} />}
      </Route>
      <Route path="/team/information" component={DocumentsPage} />
      <Route path="/team/billing" component={TuitionPage} />
      <Route path="/team/information2" component={TeamInfoPage} />
      <Route path="/team/line" component={LineNotificationsPage} />
      <Route path="/team/profile" component={CoachProfilePage} />
      <Route path="/team/invite" component={InvitePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminRouter() {
  return (
    <Switch>
      <Route path="/admins" component={AdminDashboard} />
      <Route path="/admins/teams" component={AdminTeams} />
      <Route path="/admins/sports" component={AdminSports} />
      <Route path="/admins/accounts" component={AdminAccounts} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminPortalContent({ adminId, onLogout }: { adminId: string; onLogout: () => void }) {
  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-2 md:px-8 py-4 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div>
                <h1 className="text-lg font-semibold" data-testid="text-admin-name">
                  管理者
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button 
                variant="outline" 
                size="sm"
                onClick={onLogout}
                data-testid="button-admin-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8 pb-16 md:pb-24">
            <AdminRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminPortal() {
  const [adminId, setAdminId] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedAdmin = localStorage.getItem("adminData");
    if (savedAdmin) {
      const adminData = JSON.parse(savedAdmin);
      setAdminId(adminData.id);
    }
  }, []);

  const handleLoginSuccess = (adminData: AdminData) => {
    localStorage.setItem("adminData", JSON.stringify(adminData));
    setAdminId(adminData.id);
    setLocation("/admins");
  };

  const handleLogout = () => {
    localStorage.removeItem("adminData");
    setAdminId(null);
    setLocation("/admins/login");
  };

  if (!adminId) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <AdminPortalContent adminId={adminId} onLogout={handleLogout} />;
}

function App() {
  const [location] = useLocation();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          <Route path="/register">
            {() => <RegisterPage />}
          </Route>
          <Route path="/reset-password">
            {() => <PasswordReset />}
          </Route>
          <Route path="/coach/reset-password">
            {() => <PasswordReset />}
          </Route>
          <Route path="/login">
            {() => {
              // Redirect /login to /team
              window.location.href = "/team";
              return null;
            }}
          </Route>
          <Route path="/coach/login">
            {() => <CoachPortal />}
          </Route>
          <Route path="/coach/:rest*">
            {() => <CoachPortal />}
          </Route>
          <Route path="/team">
            {() => <CoachPortal />}
          </Route>
          <Route path="/team/:rest*">
            {() => <CoachPortal />}
          </Route>
          <Route path="/admins/setup">
            {() => <AdminSetup />}
          </Route>
          <Route path="/admins/login">
            {() => <AdminPortal />}
          </Route>
          <Route path="/admins">
            {() => <AdminPortal />}
          </Route>
          <Route path="/admins/:rest*">
            {() => <AdminPortal />}
          </Route>
          <Route>
            {() => <PlayerPortal />}
          </Route>
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
