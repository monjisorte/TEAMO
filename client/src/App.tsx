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
import PlayerDashboard from "@/pages/PlayerDashboard";

interface PlayerData {
  id: string;
  name: string;
  email: string;
  teamId: string;
}

function PlayerPortal() {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedPlayer = localStorage.getItem("playerData");
    if (savedPlayer) {
      setPlayer(JSON.parse(savedPlayer));
    }
  }, []);

  const handleLoginSuccess = (playerData: PlayerData) => {
    setPlayer(playerData);
  };

  const handleLogout = () => {
    localStorage.removeItem("playerData");
    setPlayer(null);
    setLocation("/player");
  };

  if (!player) {
    return <PlayerLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <PlayerDashboard player={player} onLogout={handleLogout} />;
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
            <Router />
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
