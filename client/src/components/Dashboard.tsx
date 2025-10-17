import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// TODO: remove mock data
const MOCK_STATS = {
  upcomingEvents: 5,
  teamMembers: 24,
  activeCoaches: 3,
};

const MOCK_SCHEDULES = [
  {
    id: 1,
    title: "週末練習",
    date: "2024-10-20",
    time: "10:00",
    venue: "中央グラウンド",
    category: "U-12",
  },
  {
    id: 2,
    title: "試合 vs 東チーム",
    date: "2024-10-22",
    time: "14:00",
    venue: "市民体育館",
    category: "U-15",
  },
  {
    id: 3,
    title: "技術練習",
    date: "2024-10-25",
    time: "16:00",
    venue: "中央グラウンド",
    category: "U-12",
  },
];

export function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">ダッシュボード</h1>
        <p className="text-muted-foreground mt-2 text-lg">チームの活動状況を確認</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">今後の予定</CardTitle>
            <div className="rounded-xl bg-primary/10 p-3">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-upcoming-events">{MOCK_STATS.upcomingEvents}</div>
            <p className="text-sm text-muted-foreground mt-1">イベント</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">チームメンバー</CardTitle>
            <div className="rounded-xl bg-primary/10 p-3">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-team-members">{MOCK_STATS.teamMembers}</div>
            <p className="text-sm text-muted-foreground mt-1">名</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">コーチ</CardTitle>
            <div className="rounded-xl bg-primary/10 p-3">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-active-coaches">{MOCK_STATS.activeCoaches}</div>
            <p className="text-sm text-muted-foreground mt-1">名</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">直近のスケジュール</CardTitle>
              <Button variant="ghost" size="sm" data-testid="button-view-all">
                すべて表示
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {MOCK_SCHEDULES.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-start gap-4 p-4 rounded-2xl bg-muted/50 hover-elevate transition-all"
                data-testid={`schedule-item-${schedule.id}`}
              >
                <div className="flex flex-col items-center justify-center min-w-[60px] h-16 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white">
                  <div className="text-2xl font-bold">
                    {new Date(schedule.date).getDate()}
                  </div>
                  <div className="text-xs opacity-90">
                    {new Date(schedule.date).toLocaleDateString('ja-JP', { month: 'short' })}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{schedule.title}</h4>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <span>{schedule.time}</span>
                    <span>•</span>
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{schedule.venue}</span>
                  </div>
                  <Badge variant="outline" className="mt-3 rounded-full">{schedule.category}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">クイックアクション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start gap-3 h-14 text-base rounded-xl" data-testid="button-add-schedule">
              <Plus className="h-5 w-5" />
              スケジュールを追加
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-14 text-base rounded-xl border-2" data-testid="button-add-coach">
              <Plus className="h-5 w-5" />
              コーチを追加
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-14 text-base rounded-xl border-2" data-testid="button-manage-venues">
              <MapPin className="h-5 w-5" />
              活動場所を管理
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
