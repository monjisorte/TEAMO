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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-muted-foreground">チームの活動状況を確認</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今後の予定</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-upcoming-events">{MOCK_STATS.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground">イベント</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">チームメンバー</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-team-members">{MOCK_STATS.teamMembers}</div>
            <p className="text-xs text-muted-foreground">名</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">コーチ</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-coaches">{MOCK_STATS.activeCoaches}</div>
            <p className="text-xs text-muted-foreground">名</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>直近のスケジュール</CardTitle>
              <Button variant="ghost" size="sm" data-testid="button-view-all">
                すべて表示
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {MOCK_SCHEDULES.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-start gap-4 p-3 rounded-lg hover-elevate"
                data-testid={`schedule-item-${schedule.id}`}
              >
                <div className="flex flex-col items-center">
                  <div className="text-2xl font-bold text-primary">
                    {new Date(schedule.date).getDate()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(schedule.date).toLocaleDateString('ja-JP', { month: 'short' })}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{schedule.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span>{schedule.time}</span>
                    <span>•</span>
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{schedule.venue}</span>
                  </div>
                  <Badge variant="outline" className="mt-2">{schedule.category}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>クイックアクション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start gap-2" data-testid="button-add-schedule">
              <Plus className="h-4 w-4" />
              スケジュールを追加
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-add-coach">
              <Plus className="h-4 w-4" />
              コーチを追加
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-manage-venues">
              <MapPin className="h-4 w-4" />
              活動場所を管理
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
