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
import { PlayerSidebar } from "@/components/PlayerSidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface PlayerData {
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
              <Route path="/player/attendance">
                {() => <PlayerAttendancePage playerId={player.id} teamId={player.teamId} />}
              </Route>
              <Route path="/player/calendar">
                {() => <PlayerCalendarPage playerId={player.id} />}
              </Route>
              <Route path="/player/documents">
                {() => <PlayerDocumentsPage teamId={player.teamId} />}
              </Route>
              <Route path="/player/contact">
                {() => <PlayerContactPage teamId={player.teamId} playerName={player.name} playerEmail={player.email} />}
              </Route>
              <Route path="/player/profile">
                {() => <PlayerProfilePage playerId={player.id} teamId={player.teamId} />}
              </Route>
              <Route path="/player">
                {() => <PlayerAttendancePage playerId={player.id} teamId={player.teamId} />}
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
    setLocation("/player/attendance");
  };

  const handleLogout = () => {
    localStorage.removeItem("playerData");
    setPlayerId(null);
    setLocation("/player");
  };

  if (!playerId) {
    return <PlayerLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <PlayerPortalContent playerId={playerId} onLogout={handleLogout} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/schedules" component={SchedulesPage} />
      <Route path="/venues" component={VenuesPage} />
      <Route path="/categories" component={CategoriesPage} />
      <Route path="/coaches" component={CoachesPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/teams" component={TeamManagement} />
      <Route path="/team-info" component={TeamInfoPage} />
      <Route path="/documents" component={DocumentsPage} />
      <Route path="/tuition" component={TuitionPage} />
      <Route path="/invite" component={InvitePage} />
      <Route path="/line-notifications" component={LineNotificationsPage} />
      <Route path="/player" component={PlayerPortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isPlayerPortal = location.startsWith("/player");
  
  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isPlayerPortal ? (
          <>
            <PlayerPortal />
            <Toaster />
          </>
        ) : (
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center justify-between px-8 py-4 border-b bg-card/50 backdrop-blur-sm">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto p-8">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
