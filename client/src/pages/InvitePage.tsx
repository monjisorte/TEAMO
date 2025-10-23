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
          メンバー招待
        </h1>
        <p className="text-muted-foreground mt-2">
          新しいメンバーをチームに招待します
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>チームコード</CardTitle>
            <CardDescription>
              メンバーにこのコードを共有してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 text-center">
                <div className="text-4xl font-mono font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent py-4">
                  {team.teamCode}
                </div>
              </div>
            </div>
            <Button
              onClick={handleCopyCode}
              className="w-full"
              data-testid="button-copy-code"
            >
              <Copy className="w-4 h-4 mr-2" />
              コードをコピー
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>招待URL</CardTitle>
            <CardDescription>
              このURLをメンバーに送信してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={inviteUrl}
              readOnly
              data-testid="input-invite-url"
            />
            <Button
              onClick={handleCopyUrl}
              className="w-full"
              data-testid="button-copy-url"
            >
              <Copy className="w-4 h-4 mr-2" />
              URLをコピー
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>QRコード</CardTitle>
          <CardDescription>
            スマートフォンでスキャンして簡単に登録
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <canvas ref={canvasRef} data-testid="canvas-qr-code" />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadQR}
              data-testid="button-download-qr"
            >
              <Download className="w-4 h-4 mr-2" />
              QRコードをダウンロード
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            このQRコードをポスター、チラシ、LINEなどで共有すれば、メンバーはスマートフォンでスキャンするだけで登録ページにアクセスできます。
          </p>
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
              <dd className="text-sm font-semibold">{team.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-muted-foreground">連絡先:</dt>
              <dd className="text-sm">{team.contactEmail}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
