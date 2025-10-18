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
import TeamManagement from "@/pages/TeamManagement";
import TeamInfoPage from "@/pages/TeamInfoPage";
import DocumentsPage from "@/pages/DocumentsPage";
import TuitionPage from "@/pages/TuitionPage";
import InvitePage from "@/pages/InvitePage";
import LineNotificationsPage from "@/pages/LineNotificationsPage";
import PlayerLogin from "@/pages/PlayerLogin";
import PlayerAttendancePage from "@/pages/PlayerAttendancePage";
import PlayerCalendarPage from "@/pages/PlayerCalendarPage";
import PlayerDocumentsPage from "@/pages/PlayerDocumentsPage";
import PlayerContactPage from "@/pages/PlayerContactPage";
import PlayerProfilePage from "@/pages/PlayerProfilePage";
import CoachLogin from "@/pages/CoachLogin";
import { PlayerSidebar } from "@/components/PlayerSidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface PlayerData {
  id: string;
  name: string;
  email: string;
  teamId: string;
}

interface CoachData {
  id: string;
  name: string;
  email: string;
  teamId: string;
}

function PlayerPortalContent({ playerId, onLogout }: { playerId: string; onLogout: () => void }) {
  // Fetch latest player data from server
  const { data: player, isLoading: playerLoading } = useQuery<PlayerData>({
    queryKey: [`/api/student/${playerId}`],
    enabled: !!playerId,
  });

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
        <PlayerSidebar teamName={teamName} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-8 py-4 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-player-sidebar-toggle" />
              <div>
                <h1 className="text-lg font-semibold" data-testid="text-player-name">
                  {player.name}さん
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
          <main className="flex-1 overflow-auto p-8">
            <Switch>
              <Route path="/attendance">
                {() => <PlayerAttendancePage playerId={player.id} teamId={player.teamId} />}
              </Route>
              <Route path="/information">
                {() => <PlayerDocumentsPage teamId={player.teamId} />}
              </Route>
              <Route path="/profile">
                {() => <PlayerProfilePage playerId={player.id} teamId={player.teamId} />}
              </Route>
              <Route path="/contact">
                {() => <PlayerContactPage teamId={player.teamId} playerName={player.name} playerEmail={player.email} />}
              </Route>
              <Route path="/">
                {() => <PlayerCalendarPage playerId={player.id} />}
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
    setLocation("/login");
  };

  if (!playerId) {
    return <PlayerLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <PlayerPortalContent playerId={playerId} onLogout={handleLogout} />;
}

function CoachPortalContent({ coachId, onLogout }: { coachId: string; onLogout: () => void }) {
  // Fetch latest coach data from server
  const { data: coach, isLoading: coachLoading } = useQuery<CoachData>({
    queryKey: [`/api/coach/${coachId}`],
    enabled: !!coachId,
  });

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

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between px-8 py-4 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div>
                <h1 className="text-lg font-semibold" data-testid="text-coach-name">
                  {coach.name}さん
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
          <main className="flex-1 overflow-auto p-8">
            <Router />
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

function Router() {
  return (
    <Switch>
      <Route path="/team" component={HomePage} />
      <Route path="/team/schedule" component={SchedulesPage} />
      <Route path="/team/place" component={VenuesPage} />
      <Route path="/team/category" component={CategoriesPage} />
      <Route path="/team/staffs" component={CoachesPage} />
      <Route path="/team/setting" component={TeamManagement} />
      <Route path="/team/information" component={DocumentsPage} />
      <Route path="/team/billing" component={TuitionPage} />
      <Route path="/team/information2" component={TeamInfoPage} />
      <Route path="/team/line" component={LineNotificationsPage} />
      <Route path="/team/invite" component={InvitePage} />
      <Route path="/login" component={RegisterPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isCoachPortal = location.startsWith("/team") || location === "/login" || location === "/register";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isCoachPortal ? (
          <CoachPortal />
        ) : (
          <PlayerPortal />
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
