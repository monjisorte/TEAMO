import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Team } from "@shared/schema";

export default function InvitePage() {
  const { toast } = useToast();
  
  // Get coach's teamId from localStorage
  const coachData = localStorage.getItem("coachData");
  const teamId = coachData ? JSON.parse(coachData).teamId : null;
  
  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !!teamId,
  });

  const team = teams.find(t => t.id === teamId);

  const handleCopyId = () => {
    if (team) {
      navigator.clipboard.writeText(team.id);
      toast({
        title: "コピーしました",
        description: `チームID: ${team.id}`,
      });
    }
  };

  const handleOpenTeamoCloud = () => {
    window.open("https://teamo.cloud/", "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          チームが見つかりません。先にチームを作成してください。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          メンバー登録
        </h1>
        <p className="text-muted-foreground mt-2">
          新しいメンバーをチームに招待します
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>チームID</CardTitle>
          <CardDescription>
            メンバーにこのIDを共有し、https://teamo.cloud/ から登録してもらってください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 text-center">
              <div className="text-2xl md:text-3xl font-mono font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent py-6 break-all">
                {team.id}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCopyId}
              className="flex-1"
              data-testid="button-copy-id"
            >
              <Copy className="w-4 h-4 mr-2" />
              IDをコピー
            </Button>
            <Button
              onClick={handleOpenTeamoCloud}
              variant="outline"
              className="flex-1"
              data-testid="button-open-teamo"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              登録サイトを開く
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>登録手順</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 list-decimal list-inside text-sm">
            <li>上記のチームIDをコピーしてメンバーに共有します</li>
            <li>メンバーに <a href="https://teamo.cloud/" target="_blank" rel="noopener noreferrer" className="text-primary underline font-semibold">https://teamo.cloud/</a> にアクセスしてもらいます</li>
            <li>チームIDを入力して登録を完了してもらいます</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>チーム情報</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-muted-foreground">チーム名:</dt>
              <dd className="text-sm font-semibold" data-testid="text-team-name">{team.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-muted-foreground">チームID:</dt>
              <dd className="text-sm font-mono" data-testid="text-team-id">{team.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-muted-foreground">連絡先:</dt>
              <dd className="text-sm" data-testid="text-team-contact">{team.contactEmail}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
