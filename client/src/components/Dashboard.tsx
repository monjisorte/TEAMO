import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, MapPin, Plus, Clock } from "lucide-react";
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
import type { Schedule, Student, Category } from "@shared/schema";

interface DashboardStats {
  upcomingEvents: number;
  teamMembers: number;
  activeCoaches: number;
  schedules: Schedule[];
}

export function Dashboard() {
  const [schedulePeriod, setSchedulePeriod] = useState<string>("this-week");
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [, setLocation] = useLocation();

  // Get teamId from localStorage
  const coachData = localStorage.getItem("coachData");
  const teamId = coachData ? JSON.parse(coachData).teamId : null;

  // Fetch dashboard stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats", teamId, schedulePeriod],
    queryFn: async () => {
      const response = await fetch(`/api/stats/${teamId}?period=${schedulePeriod}`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!teamId,
  });

  // Fetch team members for the dialog
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    enabled: showMembersDialog && !!teamId,
  });

  // Fetch categories to map categoryId to category name
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories", teamId],
    enabled: !!teamId,
  });

  // カテゴリ順にソートした生徒リスト
  const teamStudents = students.filter(s => s.teamId === teamId);
  const sortedStudents = [...teamStudents].sort((a, b) => 
    (a.categoryId || "").localeCompare(b.categoryId || "") || a.name.localeCompare(b.name)
  );

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return "";
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "";
  };

  const getCategoryNames = (categoryIds: string[] | null | undefined, categoryId: string | null | undefined) => {
    const ids = categoryIds || (categoryId ? [categoryId] : []);
    if (ids.length === 0) return [];
    return ids.map(id => {
      const category = categories.find(c => c.id === id);
      return category?.name || "";
    }).filter(name => name !== "");
  };

  const getPlayerTypeLabel = (playerType: string | null | undefined) => {
    if (playerType === "team") return "チーム生";
    if (playerType === "school") return "スクール生";
    if (playerType === "inactive") return "休部";
    return "未設定";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">ダッシュボード</h1>
        <p className="text-muted-foreground mt-2 text-lg">チームの活動状況を確認</p>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <Select value={schedulePeriod} onValueChange={setSchedulePeriod}>
              <SelectTrigger className="w-[140px] border-0 shadow-none p-0 h-auto" data-testid="select-schedule-period">
                <SelectValue className="text-sm font-medium text-muted-foreground" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">今週の予定</SelectItem>
                <SelectItem value="next-week">来週の予定</SelectItem>
                <SelectItem value="this-month">今月の予定</SelectItem>
                <SelectItem value="next-month">来月の予定</SelectItem>
              </SelectContent>
            </Select>
            <div className="rounded-xl bg-primary/10 p-3">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-upcoming-events">
              {isLoadingStats ? "..." : stats?.upcomingEvents || 0}
            </div>
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
            <div className="text-4xl font-bold" data-testid="text-team-members">
              {isLoadingStats ? "..." : stats?.teamMembers || 0}
            </div>
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
            <div className="text-4xl font-bold" data-testid="text-active-coaches">
              {isLoadingStats ? "..." : stats?.activeCoaches || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">名</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">直近のスケジュール</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingStats ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">読み込み中...</p>
              </div>
            ) : !stats?.schedules || stats.schedules.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">スケジュールがありません</p>
              </div>
            ) : (
              stats.schedules
                .sort((a, b) => {
                  // 日付順（昇順）にソート
                  const dateA = new Date(a.date);
                  const dateB = new Date(b.date);
                  if (dateA.getTime() !== dateB.getTime()) {
                    return dateA.getTime() - dateB.getTime();
                  }
                  // 同じ日付の場合は開始時刻でソート（18:00が19:30の上）
                  const timeA = (a.startHour || 0) * 60 + (a.startMinute || 0);
                  const timeB = (b.startHour || 0) * 60 + (b.startMinute || 0);
                  return timeA - timeB;
                })
                .slice(0, 4)
                .map((schedule) => {
                  const startTime = schedule.startHour !== null && schedule.startMinute !== null
                    ? `${String(schedule.startHour).padStart(2, '0')}:${String(schedule.startMinute).padStart(2, '0')}`
                    : "時刻未定";
                  
                  const categoryNames = getCategoryNames(schedule.categoryIds, schedule.categoryId);
                  
                  return (
                    <div
                      key={schedule.id}
                      className="flex items-start gap-4 p-4 rounded-2xl bg-muted/50 hover-elevate transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedSchedule(schedule);
                        setShowScheduleDialog(true);
                      }}
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
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{startTime}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{schedule.venue || "未定"}</span>
                          </div>
                        </div>
                        {categoryNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {categoryNames.map((name, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">クイックアクション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full justify-start gap-3 h-14 text-base rounded-xl" 
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setLocation("/team/schedule");
              }}
              data-testid="button-add-schedule"
            >
              <Plus className="h-5 w-5" />
              スケジュールを追加
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
              {sortedStudents.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">チームメンバーがいません</p>
                </div>
              ) : (
                sortedStudents.map((student) => (
                  <div 
                    key={student.id} 
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover-elevate"
                    data-testid={`member-${student.id}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex flex-col">
                        <span className="font-semibold text-base">{student.name}</span>
                        <span className="text-xs text-muted-foreground">
                          登録日: {student.createdAt ? new Date(student.createdAt).toLocaleDateString('ja-JP') : "不明"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-full">
                        {getPlayerTypeLabel(student.playerType)}
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        {getCategoryName(student.categoryId)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* スケジュール詳細ポップアップ */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">スケジュール詳細</DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-600/10">
                <h3 className="text-xl font-bold">{selectedSchedule.title}</h3>
              </div>
              
              <div className="grid gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">日付</p>
                    <p className="font-medium">
                      {new Date(selectedSchedule.date).toLocaleDateString('ja-JP', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">時間</p>
                    <p className="font-medium">
                      {selectedSchedule.startHour !== null && selectedSchedule.startMinute !== null
                        ? `${String(selectedSchedule.startHour).padStart(2, '0')}:${String(selectedSchedule.startMinute).padStart(2, '0')}`
                        : "時刻未定"}
                      {selectedSchedule.endHour !== null && selectedSchedule.endMinute !== null
                        ? ` - ${String(selectedSchedule.endHour).padStart(2, '0')}:${String(selectedSchedule.endMinute).padStart(2, '0')}`
                        : ""}
                    </p>
                    {selectedSchedule.gatherHour !== null && selectedSchedule.gatherMinute !== null && (
                      <p className="text-sm text-muted-foreground">
                        集合: {String(selectedSchedule.gatherHour).padStart(2, '0')}:{String(selectedSchedule.gatherMinute).padStart(2, '0')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">会場</p>
                    <p className="font-medium">{selectedSchedule.venue || "未定"}</p>
                  </div>
                </div>

                {getCategoryNames(selectedSchedule.categoryIds, selectedSchedule.categoryId).length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">カテゴリー</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {getCategoryNames(selectedSchedule.categoryIds, selectedSchedule.categoryId).map((name, idx) => (
                          <Badge key={idx} variant="secondary">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedSchedule.notes && (
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">備考</p>
                      <p className="whitespace-pre-wrap">{selectedSchedule.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleDialog(false)}
                  data-testid="button-close-schedule-dialog"
                >
                  閉じる
                </Button>
                <Button
                  onClick={() => {
                    setShowScheduleDialog(false);
                    setLocation("/team/schedule");
                  }}
                  data-testid="button-goto-schedule"
                >
                  スケジュール管理へ
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
