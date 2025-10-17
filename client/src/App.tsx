import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import PlayerSettingsPage from "@/pages/PlayerSettingsPage";
import { PlayerSidebar } from "@/components/PlayerSidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface PlayerData {
  id: string;
  name: string;
  email: string;
  teamId: string;
}

function PlayerPortal() {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [, setLocation] = useLocation();
  const [currentLocation] = useLocation();

  useEffect(() => {
    const savedPlayer = localStorage.getItem("playerData");
    if (savedPlayer) {
      setPlayer(JSON.parse(savedPlayer));
    }
  }, []);

  const handleLoginSuccess = (playerData: PlayerData) => {
    setPlayer(playerData);
    setLocation("/player/attendance");
  };

  const handleLogout = () => {
    localStorage.removeItem("playerData");
    setPlayer(null);
    setLocation("/player");
  };

  if (!player) {
    return <PlayerLogin onLoginSuccess={handleLoginSuccess} />;
  }

  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <PlayerSidebar />
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
                onClick={handleLogout}
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
                {() => <PlayerAttendancePage playerId={player.id} />}
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
              <Route path="/player/settings">
                {() => <PlayerSettingsPage playerId={player.id} />}
              </Route>
              <Route path="/player">
                {() => <PlayerAttendancePage playerId={player.id} />}
              </Route>
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
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
