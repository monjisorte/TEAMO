import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Calendar, UserCircle, MapPin, Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFullName, getInitials } from "@/lib/nameUtils";

interface TeamWithStats {
  id: string;
  name: string;
  sportType: string | null;
  address: string | null;
  contactEmail: string;
  coachCount: number;
  memberCount: number;
  eventCount: number;
}

interface TeamDetails extends TeamWithStats {
  coaches: Array<{
    id: string;
    name: string;
    email: string;
    lastName?: string;
    firstName?: string;
    photoUrl?: string;
    position?: string;
  }>;
  members: Array<{
    id: string;
    name: string;
    email: string;
    photoUrl?: string;
    playerType?: string;
  }>;
}

export default function AdminTeams() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const { data: teams, isLoading } = useQuery<TeamWithStats[]>({
    queryKey: ["/api/admin/teams"],
  });

  const { data: teamDetails } = useQuery<TeamDetails>({
    queryKey: ["/api/admin/teams", selectedTeamId],
    enabled: !!selectedTeamId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          チーム一覧
        </h1>
        <p className="text-muted-foreground mt-2">
          全登録チームの管理
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teams?.map((team) => (
          <Card
            key={team.id}
            className="hover-elevate cursor-pointer active-elevate-2"
            onClick={() => setSelectedTeamId(team.id)}
            data-testid={`card-team-${team.id}`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{team.name}</CardTitle>
                {team.sportType && (
                  <Badge variant="secondary">{team.sportType}</Badge>
                )}
              </div>
              <CardDescription className="flex items-center gap-1 mt-2">
                <Mail className="h-3 w-3" />
                {team.contactEmail}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserCircle className="h-4 w-4" />
                  <span>コーチ</span>
                </div>
                <span className="font-semibold" data-testid={`text-coach-count-${team.id}`}>
                  {team.coachCount}人
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>メンバー</span>
                </div>
                <span className="font-semibold" data-testid={`text-member-count-${team.id}`}>
                  {team.memberCount}人
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>イベント</span>
                </div>
                <span className="font-semibold" data-testid={`text-event-count-${team.id}`}>
                  {team.eventCount}件
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedTeamId} onOpenChange={(open) => !open && setSelectedTeamId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {teamDetails?.name}
            </DialogTitle>
            <DialogDescription>
              チーム詳細情報
            </DialogDescription>
          </DialogHeader>

          {teamDetails && (
            <div className="space-y-6 mt-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    連絡先
                  </h3>
                  <p className="text-sm text-muted-foreground">{teamDetails.contactEmail}</p>
                </div>

                {teamDetails.sportType && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">スポーツ種別</h3>
                    <Badge>{teamDetails.sportType}</Badge>
                  </div>
                )}

                {teamDetails.address && (
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      住所
                    </h3>
                    <p className="text-sm text-muted-foreground">{teamDetails.address}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  登録コーチ ({teamDetails.coaches.length}人)
                </h3>
                <div className="space-y-2">
                  {teamDetails.coaches.map((coach) => {
                    const displayName = getFullName(coach.lastName, coach.firstName);
                    
                    return (
                      <Card key={coach.id} data-testid={`card-coach-${coach.id}`}>
                        <CardContent className="flex items-center gap-3 p-4">
                          <Avatar>
                            <AvatarImage src={coach.photoUrl} />
                            <AvatarFallback>
                              {getInitials(coach.lastName, coach.firstName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{displayName}</p>
                            {coach.position && (
                              <p className="text-xs text-muted-foreground">{coach.position}</p>
                            )}
                            <p className="text-sm text-muted-foreground">{coach.email}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  登録メンバー ({teamDetails.members.length}人)
                </h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {teamDetails.members.map((member) => (
                    <Card key={member.id} data-testid={`card-member-${member.id}`}>
                      <CardContent className="flex items-center gap-3 p-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.photoUrl} />
                          <AvatarFallback>
                            {member.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                        {member.playerType && (
                          <Badge variant="outline" className="shrink-0">
                            {member.playerType === "member" ? "チーム" : "スクール"}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
