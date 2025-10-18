import { ClubRegistration } from "@/components/ClubRegistration";
import { useLocation } from "wouter";

export default function RegisterPage() {
  const [, setLocation] = useLocation();

  const handleRegistrationSuccess = (coach: { id: string; name: string; email: string; teamId: string }) => {
    // Redirect to coach portal after successful registration
    setLocation("/team");
  };

  return <ClubRegistration onRegistrationSuccess={handleRegistrationSuccess} />;
}
