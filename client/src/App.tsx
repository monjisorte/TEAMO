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
import StudentLogin from "@/pages/StudentLogin";
import StudentDashboard from "@/pages/StudentDashboard";

interface StudentData {
  id: string;
  name: string;
  email: string;
  teamId: string;
}

function StudentPortal() {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const savedStudent = localStorage.getItem("studentData");
    if (savedStudent) {
      setStudent(JSON.parse(savedStudent));
    }
  }, []);

  const handleLoginSuccess = (studentData: StudentData) => {
    setStudent(studentData);
  };

  const handleLogout = () => {
    localStorage.removeItem("studentData");
    setStudent(null);
    setLocation("/student");
  };

  if (!student) {
    return <StudentLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <StudentDashboard student={student} onLogout={handleLogout} />;
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
      <Route path="/student" component={StudentPortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isStudentPortal = location.startsWith("/student");
  
  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isStudentPortal ? (
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
