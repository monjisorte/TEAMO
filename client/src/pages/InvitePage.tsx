import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Team } from "@shared/schema";

export default function InvitePage() {
  // Set page title
  useEffect(() => {
    document.title = "招待管理 | TEAMOコーチ";
  }, []);

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
      navigator.clipboard.writeText(team.teamCode);
      toast({
        title: "コピーしました",
        description: `チームID: ${team.teamCode}`,
      });
    }
  };

  const handleOpenTeamoCloud = () => {
    window.open("https://teamo.cloud/", "_blank");
  };

  const handleCopyTeamMessage = () => {
    if (team) {
      const message = `https://teamo.cloud/ から登録をお願いします。チームIDは ${team.teamCode} です。\nログイン後、プロフィールやカテゴリを登録してください。出欠も記入をお願いします。\n兄弟がいる場合は、別のメールアドレスで登録し、プロフィール設定「兄弟アカウント管理」より、連携をお願いします。再ログインなく、アカウントの切り替えができるようになります。`;
      navigator.clipboard.writeText(message);
      toast({
        title: "コピーしました",
        description: "チーム生用の登録手順をコピーしました",
      });
    }
  };

  const handleCopySchoolMessage = () => {
    if (team) {
      const schoolCode = `${team.teamCode}X`;
      const message = `https://teamo.cloud/ から登録をお願いします。チームIDは ${schoolCode} です。\nログイン後、プロフィールやカテゴリを登録してください。出欠も記入をお願いします。\n兄弟がいる場合は、別のメールアドレスで登録し、プロフィール設定「兄弟アカウント管理」より、連携をお願いします。再ログインなく、アカウントの切り替えができるようになります。`;
      navigator.clipboard.writeText(message);
      toast({
        title: "コピーしました",
        description: "スクール生用の登録手順をコピーしました",
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
              <div className="text-4xl md:text-5xl font-mono font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent py-6">
                {team.teamCode}
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
          <CardTitle>チーム生用 登録手順</CardTitle>
          <CardDescription>
            チームに所属する選手用の登録手順です
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm whitespace-pre-line">
              https://teamo.cloud/ から登録をお願いします。チームIDは <span className="font-bold text-primary">{team.teamCode}</span> です。{'\n'}
              ログイン後、プロフィールやカテゴリを登録してください。出欠も記入をお願いします。{'\n'}
              兄弟がいる場合は、別のメールアドレスで登録し、プロフィール設定「兄弟アカウント管理」より、連携をお願いします。再ログインなく、アカウントの切り替えができるようになります。
            </p>
          </div>
          <Button
            onClick={handleCopyTeamMessage}
            className="w-full"
            data-testid="button-copy-team-message"
          >
            <Copy className="w-4 h-4 mr-2" />
            文面をコピー
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>スクール生用 登録手順</CardTitle>
          <CardDescription>
            スクールに通う生徒用の登録手順です
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm whitespace-pre-line">
              https://teamo.cloud/ から登録をお願いします。チームIDは <span className="font-bold text-primary">{team.teamCode}X</span> です。{'\n'}
              ログイン後、プロフィールやカテゴリを登録してください。出欠も記入をお願いします。{'\n'}
              兄弟がいる場合は、別のメールアドレスで登録し、プロフィール設定「兄弟アカウント管理」より、連携をお願いします。再ログインなく、アカウントの切り替えができるようになります。
            </p>
          </div>
          <Button
            onClick={handleCopySchoolMessage}
            className="w-full"
            data-testid="button-copy-school-message"
          >
            <Copy className="w-4 h-4 mr-2" />
            文面をコピー
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
