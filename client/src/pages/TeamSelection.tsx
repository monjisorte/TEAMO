import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Team {
  teamId: string;
  teamName: string;
  teamCode: string;
  role: string;
}

interface TeamSelectionProps {
  coach: {
    id: string;
    name: string;
    email: string;
    teams: Team[];
  };
  onTeamSelect: (team: Team) => void;
}

export default function TeamSelection({ coach, onTeamSelect }: TeamSelectionProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            チームを選択
          </CardTitle>
          <p className="text-center text-muted-foreground mt-2">
            {coach.name} さん、どのチームで作業しますか？
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {coach.teams.map((team) => (
            <Card
              key={team.teamId}
              className="border-2 hover-elevate cursor-pointer transition-all"
              onClick={() => onTeamSelect(team)}
              data-testid={`team-select-${team.teamId}`}
            >
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{team.teamName}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    チームコード: {team.teamCode}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    役割: {team.role === "owner" ? "オーナー" : team.role === "coach" ? "コーチ" : "アシスタント"}
                  </p>
                </div>
                <Button variant="outline" data-testid={`button-select-${team.teamId}`}>
                  選択
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
