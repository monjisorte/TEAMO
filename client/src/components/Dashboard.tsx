import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// TODO: remove mock data
const MOCK_STUDENTS = [
  { id: "1", name: "田中太郎", categoryId: "cat-1", categoryName: "U-12", registeredDate: "2024-08-15" },
  { id: "2", name: "佐藤花子", categoryId: "cat-1", categoryName: "U-12", registeredDate: "2024-08-20" },
  { id: "3", name: "鈴木一郎", categoryId: "cat-1", categoryName: "U-12", registeredDate: "2024-09-01" },
  { id: "4", name: "高橋美咲", categoryId: "cat-2", categoryName: "U-15", registeredDate: "2024-07-10" },
  { id: "5", name: "渡辺健太", categoryId: "cat-2", categoryName: "U-15", registeredDate: "2024-07-15" },
  { id: "6", name: "伊藤さくら", categoryId: "cat-2", categoryName: "U-15", registeredDate: "2024-08-05" },
  { id: "7", name: "山本大輔", categoryId: "cat-1", categoryName: "U-12", registeredDate: "2024-09-10" },
  { id: "8", name: "中村愛", categoryId: "cat-2", categoryName: "U-15", registeredDate: "2024-08-25" },
];

const MOCK_STATS = {
  upcomingEvents: 5,
  teamMembers: MOCK_STUDENTS.length,
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
  {
    id: 4,
    title: "合同練習",
    date: "2024-10-27",
    time: "10:00",
    venue: "県立スタジアム",
    category: "全学年",
  },
  {
    id: 5,
    title: "体力測定",
    date: "2024-11-03",
    time: "09:00",
    venue: "中央グラウンド",
    category: "U-12",
  },
  {
    id: 6,
    title: "親子サッカー",
    date: "2024-11-05",
    time: "14:00",
    venue: "市民体育館",
    category: "全学年",
  },
];

export function Dashboard() {
  const [schedulePeriod, setSchedulePeriod] = useState<string>("this-week");
  const [showMembersDialog, setShowMembersDialog] = useState(false);

  // カテゴリ順にソートした生徒リスト
  const sortedStudents = [...MOCK_STUDENTS].sort((a, b) => 
    a.categoryId.localeCompare(b.categoryId) || a.name.localeCompare(b.name)
  );

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
          <CardContent className="space-y-3">
            <div className="text-4xl font-bold" data-testid="text-upcoming-events">{MOCK_STATS.upcomingEvents}</div>
            <Select value={schedulePeriod} onValueChange={setSchedulePeriod}>
              <SelectTrigger className="w-full" data-testid="select-schedule-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">今週の予定</SelectItem>
                <SelectItem value="next-week">来週の予定</SelectItem>
                <SelectItem value="this-month">今月の予定</SelectItem>
                <SelectItem value="next-month">来月の予定</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-lg cursor-pointer hover-elevate transition-all"
          onClick={() => setShowMembersDialog(true)}
          data-testid="card-team-members"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">チームメンバー</CardTitle>
            <div className="rounded-xl bg-primary/10 p-3">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-team-members">{MOCK_STATS.teamMembers}</div>
            <p className="text-sm text-muted-foreground mt-1">クリックして詳細表示</p>
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

      <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
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
            {MOCK_SCHEDULES.slice(0, 4).map((schedule) => (
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

      {/* チームメンバーポップアップ */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">チームメンバー一覧</DialogTitle>
            <DialogDescription>
              カテゴリごとに整理された登録メンバー
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-600/10">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">合計 {sortedStudents.length}名</span>
              </div>
            </div>

            <div className="space-y-2">
              {sortedStudents.map((student) => (
                <div 
                  key={student.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover-elevate"
                  data-testid={`member-${student.id}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex flex-col">
                      <span className="font-semibold text-base">{student.name}</span>
                      <span className="text-xs text-muted-foreground">
                        登録日: {new Date(student.registeredDate).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full">
                    {student.categoryName}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
