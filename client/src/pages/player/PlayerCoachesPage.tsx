import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Mail } from "lucide-react";
import type { Coach } from "@shared/schema";

interface PlayerCoachesPageProps {
  teamId: string;
}

export default function PlayerCoachesPage({ teamId }: PlayerCoachesPageProps) {
  const { data: coaches, isLoading } = useQuery<Coach[]>({
    queryKey: ["/api/team", teamId, "coaches"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!coaches || coaches.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">コーチ情報がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          コーチ
        </h1>
        <p className="text-muted-foreground mt-2">
          チームのコーチ紹介
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {coaches.map((coach) => {
          const fullName = coach.lastName && coach.firstName
            ? `${coach.lastName} ${coach.firstName}`
            : coach.name;
          
          const fullNameKana = coach.lastNameKana && coach.firstNameKana
            ? `${coach.lastNameKana} ${coach.firstNameKana}`
            : "";

          return (
            <Card
              key={coach.id}
              className="overflow-hidden hover-elevate"
              data-testid={`card-coach-${coach.id}`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20 border-2 border-primary/20">
                    <AvatarImage src={coach.photoUrl || ""} alt={fullName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-xl">
                      <User className="h-10 w-10" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-2xl" data-testid={`text-coach-name-${coach.id}`}>
                      {fullName}
                    </CardTitle>
                    {fullNameKana && (
                      <CardDescription className="mt-1" data-testid={`text-coach-kana-${coach.id}`}>
                        {fullNameKana}
                      </CardDescription>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span data-testid={`text-coach-email-${coach.id}`}>{coach.email}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {coach.bio && (
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">プロフィール</h4>
                    <p
                      className="text-sm whitespace-pre-wrap leading-relaxed"
                      data-testid={`text-coach-bio-${coach.id}`}
                    >
                      {coach.bio}
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
