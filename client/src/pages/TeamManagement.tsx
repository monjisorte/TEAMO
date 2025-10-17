import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Team } from "@shared/schema";

export default function TeamManagement() {
  const { toast } = useToast();
  const [teamName, setTeamName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: { name: string; contactEmail: string }) => {
      return await apiRequest("POST", "/api/teams", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setTeamName("");
      setContactEmail("");
      toast({
        title: "成功",
        description: "チームを作成しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "チーム作成中にエラーが発生しました",
        variant: "destructive",
      });
    },
  });

  const handleCopyTeamCode = (teamCode: string) => {
    navigator.clipboard.writeText(teamCode);
    toast({
      title: "コピーしました",
      description: `チームID: ${teamCode}`,
    });
  };

  const handleCreateTeam = () => {
    if (!teamName || !contactEmail) {
      toast({
        title: "エラー",
        description: "すべての項目を入力してください",
        variant: "destructive",
      });
      return;
    }
    createTeamMutation.mutate({ name: teamName, contactEmail });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          チーム管理
        </h1>
        <p className="text-muted-foreground mt-2">
          チームを作成してチームIDを生徒に共有しましょう
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新しいチームを作成</CardTitle>
          <CardDescription>
            チームIDは自動生成されます。生徒はこのIDでチームに参加できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">チーム名</label>
            <Input
              placeholder="U-15 サッカーチーム"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              data-testid="input-team-name"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              連絡先メールアドレス
            </label>
            <Input
              type="email"
              placeholder="coach@example.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              data-testid="input-contact-email"
            />
          </div>
          <Button
            onClick={handleCreateTeam}
            disabled={createTeamMutation.isPending}
            data-testid="button-create-team"
          >
            {createTeamMutation.isPending ? "作成中..." : "チームを作成"}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            読み込み中...
          </CardContent>
        </Card>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            チームがありません。上記のフォームから作成してください。
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.id} data-testid={`card-team-${team.id}`}>
              <CardHeader>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>{team.contactEmail}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    チームID（生徒に共有）
                  </label>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-lg font-mono px-4 py-2"
                      data-testid={`text-team-code-${team.id}`}
                    >
                      {team.teamCode}
                    </Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyTeamCode(team.teamCode)}
                      data-testid={`button-copy-code-${team.id}`}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  生徒はこのチームIDを使ってアカウント登録できます
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
