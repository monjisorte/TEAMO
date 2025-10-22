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
import LandingPage from "@/pages/LandingPage";
import TuitionPage from "@/pages/TuitionPage";
import LineNotificationsPage from "@/pages/LineNotificationsPage";
import PlayerLogin from "@/pages/PlayerLogin";
import PasswordReset from "@/pages/PasswordReset";
import PlayerAttendancePage from "@/pages/PlayerAttendancePage";
import PlayerCalendarPage from "@/pages/PlayerCalendarPage";
import PlayerDocumentsPage from "@/pages/PlayerDocumentsPage";
import PlayerProfilePage from "@/pages/PlayerProfilePage";
import PlayerMembersPage from "@/pages/player/PlayerMembersPage";
import PlayerCoachesPage from "@/pages/player/PlayerCoachesPage";
import CoachLogin from "@/pages/CoachLogin";
import TeamSelection from "@/pages/TeamSelection";
import MembersPage from "@/pages/MembersPage";
import CoachProfilePage from "@/pages/CoachProfilePage";
import AdminLogin from "@/pages/AdminLogin";
import AdminSetup from "@/pages/AdminSetup";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminTeams from "@/pages/admin/AdminTeams";
import AdminAccounts from "@/pages/admin/AdminAccounts";
import { PlayerSidebar } from "@/components/PlayerSidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";

// Redirect component for internal routing
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  
  return null;
}

interface PlayerData {
  id: string;
  name: string;
  email: string;
  teamId: string;
  lastName?: string;
  firstName?: string;
  lastNameKana?: string;
  firstNameKana?: string;
}

interface Team {
  teamId: string;
  teamName: string;
  teamCode: string;
  role: string;
}

interface CoachData {
  id: string;
  name: string;
  email: string;
  teamId?: string; // Optional now, set after team selection
  teams?: Team[]; // Array of teams the coach belongs to
  lastName?: string;
  firstName?: string;
  lastNameKana?: string;
  firstNameKana?: string;
  photoUrl?: string;
  bio?: string;
  position?: string;
}

interface AdminData {
  id: string;
  name: string;
  email: string;
}

function PlayerPortalContent({ playerId, onLogout }: { playerId: string; onLogout: () => void }) {
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
  const { data: teams } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/teams"],
    enabled: !!player?.teamId,
  });

  const team = teams?.find(t => t.id === player?.teamId);
  const teamName = team?.name || "チーム";

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
        <PlayerSidebar teamName={teamName} teamId={player.teamId} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-2 md:px-8 py-4 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger data-testid="button-player-sidebar-toggle" />
              <div>
                <h1 className="text-lg font-semibold" data-testid="text-player-name">
                  {player.lastName && player.firstName 
                    ? `${player.lastName}${player.firstName}さん` 
                    : `${player.name}さん`}
                </h1>
                <p className="text-xs text-muted-foreground">{player.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button 
                variant="outline" 
                size="sm"
                onClick={onLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                ログアウト
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

function CoachPortalContent({ coachId, teamId, onLogout }: { coachId: string; teamId: string; onLogout: () => void }) {
  // Fetch latest coach data from server
  const { data: coach, isLoading: coachLoading } = useQuery<CoachData>({
    queryKey: [`/api/coach/${coachId}`],
    enabled: !!coachId,
  });

  // Fetch team info
  const { data: teams } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/teams"],
    enabled: !!teamId,
  });

  const team = teams?.find(t => t.id === teamId);
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
  const displayName = coach.lastName && coach.firstName
    ? `${coach.lastName} ${coach.firstName}`
    : coach.name;

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar teamId={teamId} teamName={teamName} />
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
            <CoachRouter teamId={teamId} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function CoachPortal() {
  const [coachId, setCoachId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [initialCoachData, setInitialCoachData] = useState<CoachData | null>(null);
  const [needsTeamValidation, setNeedsTeamValidation] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedCoach = localStorage.getItem("coachData");
    if (savedCoach) {
      const coachData = JSON.parse(savedCoach);
      setCoachId(coachData.id);
      if (coachData.teamId) {
        setSelectedTeamId(coachData.teamId);
        // Mark that we need to validate this teamId
        setNeedsTeamValidation(true);
      }
    }
  }, []);

  const handleLoginSuccess = (coachData: CoachData) => {
    setInitialCoachData(coachData);
    setCoachId(coachData.id);
    
    // If coach has only one team, auto-select it
    if (coachData.teams && coachData.teams.length === 1) {
      const team = coachData.teams[0];
      const coachDataWithTeam = { ...coachData, teamId: team.teamId };
      localStorage.setItem("coachData", JSON.stringify(coachDataWithTeam));
      setSelectedTeamId(team.teamId);
      setLocation("/team");
    }
    // If coach has multiple teams, show team selection
    else if (coachData.teams && coachData.teams.length > 1) {
      // Don't set teamId yet, show team selection screen
    }
  };

  const handleTeamSelect = (team: Team) => {
    if (!initialCoachData) return;
    
    const coachDataWithTeam = { ...initialCoachData, teamId: team.teamId };
    localStorage.setItem("coachData", JSON.stringify(coachDataWithTeam));
    setSelectedTeamId(team.teamId);
    setNeedsTeamValidation(false);
    setLocation("/team");
  };

  const handleLogout = () => {
    localStorage.removeItem("coachData");
    setCoachId(null);
    setSelectedTeamId(null);
    setInitialCoachData(null);
    setLocation("/");
  };

  // Not logged in
  if (!coachId) {
    return <CoachLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // Logged in but teamId needs validation or is missing - need to fetch teams first
  if (coachId && (!selectedTeamId || needsTeamValidation) && !initialCoachData) {
    // This happens when user has old localStorage without teamId
    // Or when we need to validate the cached teamId
    return <CoachLoginRedirect 
      coachId={coachId} 
      onLogout={handleLogout} 
      onTeamsLoaded={(coach) => {
        setInitialCoachData(coach);
        setNeedsTeamValidation(false);
        
        // Validate cached teamId if present
        if (selectedTeamId && coach.teams) {
          const isValidTeam = coach.teams.some(t => t.teamId === selectedTeamId);
          if (!isValidTeam) {
            // Cached teamId is invalid, clear it
            setSelectedTeamId(null);
            const coachDataWithoutTeam = { ...coach };
            delete coachDataWithoutTeam.teamId;
            localStorage.setItem("coachData", JSON.stringify(coachDataWithoutTeam));
            return;
          }
        }
        
        // Auto-select if only one team
        if (coach.teams && coach.teams.length === 1 && !selectedTeamId) {
          const team = coach.teams[0];
          const coachDataWithTeam = { ...coach, teamId: team.teamId };
          localStorage.setItem("coachData", JSON.stringify(coachDataWithTeam));
          setSelectedTeamId(team.teamId);
        }
      }} 
    />;
  }

  // Handle zero teams case (after teams loaded)
  if (coachId && initialCoachData?.teams && initialCoachData.teams.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-destructive">
              チームが見つかりません
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              このアカウントはどのチームにも所属していません。
            </p>
            <p className="text-muted-foreground">
              チームの管理者に連絡して、チームに追加してもらってください。
            </p>
            <Button onClick={handleLogout} data-testid="button-logout-no-teams">
              ログアウト
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Logged in but no team selected (multiple teams)
  if (coachId && !selectedTeamId && initialCoachData?.teams && initialCoachData.teams.length > 0) {
    return <TeamSelection coach={{ ...initialCoachData, teams: initialCoachData.teams }} onTeamSelect={handleTeamSelect} />;
  }

  // Logged in and team selected (validation complete)
  if (coachId && selectedTeamId && !needsTeamValidation) {
    return <CoachPortalContent coachId={coachId} teamId={selectedTeamId} onLogout={handleLogout} />;
  }

  // Loading state
  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">読み込み中...</p>
    </div>
  );
}

// Helper component to fetch teams for logged-in coach without teamId
function CoachLoginRedirect({ coachId, onLogout, onTeamsLoaded }: {
  coachId: string;
  onLogout: () => void;
  onTeamsLoaded: (coach: CoachData) => void;
}) {
  const { data: coachTeams, isLoading } = useQuery<Team[]>({
    queryKey: [`/api/coaches/${coachId}/teams`],
    enabled: !!coachId,
  });

  const { data: coach } = useQuery<CoachData>({
    queryKey: [`/api/coach/${coachId}`],
    enabled: !!coachId,
  });

  useEffect(() => {
    if (coach && coachTeams !== undefined) {
      onTeamsLoaded({ ...coach, teams: coachTeams });
    }
  }, [coach, coachTeams, onTeamsLoaded]);

  if (isLoading || !coach || coachTeams === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">チーム情報を読み込み中...</p>
      </div>
    );
  }

  // Handle zero teams case
  if (coachTeams.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-destructive">
              チームが見つかりません
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              このアカウントはどのチームにも所属していません。
            </p>
            <p className="text-muted-foreground">
              チームの管理者に連絡して、チームに追加してもらってください。
            </p>
            <Button onClick={onLogout} data-testid="button-logout-no-teams">
              ログアウト
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">読み込み中...</p>
    </div>
  );
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
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminRouter() {
  return (
    <Switch>
      <Route path="/admins" component={AdminDashboard} />
      <Route path="/admins/teams" component={AdminTeams} />
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
    setLocation("/");
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
          <Route path="/login">
            {() => <Redirect to="/team" />}
          </Route>
          <Route path="/team/:rest*">
            {() => <CoachPortal />}
          </Route>
          <Route path="/team">
            {() => <CoachPortal />}
          </Route>
          <Route path="/player/:rest*">
            {() => <PlayerPortal />}
          </Route>
          <Route path="/player">
            {() => <PlayerPortal />}
          </Route>
          <Route path="/admins/setup">
            {() => <AdminSetup />}
          </Route>
          <Route path="/admins/login">
            {() => <AdminPortal />}
          </Route>
          <Route path="/admins/:rest*">
            {() => <AdminPortal />}
          </Route>
          <Route path="/admins">
            {() => <AdminPortal />}
          </Route>
          <Route path="/">
            {() => <LandingPage />}
          </Route>
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
