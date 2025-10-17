import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Plus, Clock, Edit, Trash2, CalendarDays, List, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// TODO: remove mock data
const MOCK_STUDENTS = [
  { id: "1", name: "田中太郎", categoryId: "cat-1" },
  { id: "2", name: "佐藤花子", categoryId: "cat-1" },
  { id: "3", name: "鈴木一郎", categoryId: "cat-1" },
  { id: "4", name: "高橋美咲", categoryId: "cat-2" },
  { id: "5", name: "渡辺健太", categoryId: "cat-2" },
  { id: "6", name: "伊藤さくら", categoryId: "cat-2" },
  { id: "7", name: "山本大輔", categoryId: "cat-1" },
  { id: "8", name: "中村愛", categoryId: "cat-2" },
];

const MOCK_ATTENDANCES = [
  // スケジュール1の出席
  { id: "a1", scheduleId: "1", studentId: "1", status: "○" },
  { id: "a2", scheduleId: "1", studentId: "2", status: "○" },
  { id: "a3", scheduleId: "1", studentId: "3", status: "△" },
  { id: "a4", scheduleId: "1", studentId: "7", status: "×" },
  // スケジュール2の出席
  { id: "a5", scheduleId: "2", studentId: "4", status: "○" },
  { id: "a6", scheduleId: "2", studentId: "5", status: "○" },
  { id: "a7", scheduleId: "2", studentId: "6", status: "○" },
  { id: "a8", scheduleId: "2", studentId: "8", status: "△" },
  // スケジュール3の出席
  { id: "a9", scheduleId: "3", studentId: "1", status: "○" },
  { id: "a10", scheduleId: "3", studentId: "2", status: "○" },
  { id: "a11", scheduleId: "3", studentId: "3", status: "○" },
  { id: "a12", scheduleId: "3", studentId: "7", status: "△" },
];

const MOCK_SCHEDULES = [
  {
    id: "1",
    title: "週末練習",
    date: "2024-10-20",
    startTime: "10:00",
    endTime: "12:00",
    gatherTime: "09:45",
    venue: "中央グラウンド",
    category: "U-12",
    notes: "ボールと水筒を持参してください",
  },
  {
    id: "2",
    title: "試合 vs 東チーム",
    date: "2024-10-22",
    startTime: "14:00",
    endTime: "16:00",
    gatherTime: "13:30",
    venue: "市民体育館",
    category: "U-15",
    notes: "ユニフォーム着用",
  },
  {
    id: "3",
    title: "技術練習",
    date: "2024-10-25",
    startTime: "16:00",
    endTime: "18:00",
    gatherTime: "15:45",
    venue: "中央グラウンド",
    category: "U-12",
    notes: "",
  },
  {
    id: "4",
    title: "合同練習",
    date: "2024-10-27",
    startTime: "10:00",
    endTime: "13:00",
    gatherTime: "09:30",
    venue: "県立スタジアム",
    category: "全学年",
    notes: "お弁当持参",
  },
];

export function ScheduleList() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [moveStudentDialog, setMoveStudentDialog] = useState<{
    open: boolean;
    studentId: string;
    studentName: string;
    currentScheduleId: string;
  }>({ open: false, studentId: "", studentName: "", currentScheduleId: "" });

  // 出席状況を集計
  const getAttendanceCount = (scheduleId: string) => {
    const attendances = MOCK_ATTENDANCES.filter(a => a.scheduleId === scheduleId);
    return {
      present: attendances.filter(a => a.status === "○").length,
      maybe: attendances.filter(a => a.status === "△").length,
      absent: attendances.filter(a => a.status === "×").length,
    };
  };

  // スケジュールの参加者リストを取得
  const getScheduleAttendees = (scheduleId: string) => {
    const attendances = MOCK_ATTENDANCES.filter(a => a.scheduleId === scheduleId);
    return attendances.map(attendance => {
      const student = MOCK_STUDENTS.find(s => s.id === attendance.studentId);
      return {
        ...attendance,
        studentName: student?.name || "不明",
      };
    });
  };

  // 生徒を別のスケジュールに移動
  const handleMoveStudent = (targetScheduleId: string) => {
    console.log(`生徒 ${moveStudentDialog.studentName} をスケジュール ${targetScheduleId} に移動`);
    setMoveStudentDialog({ open: false, studentId: "", studentName: "", currentScheduleId: "" });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">スケジュール管理</h1>
          <p className="text-muted-foreground mt-2 text-lg">日々の活動を登録・管理</p>
        </div>
        <Button className="h-12 px-6 rounded-xl text-base" data-testid="button-add-schedule">
          <Plus className="h-5 w-5 mr-2" />
          新規追加
        </Button>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")} className="w-full">
        <TabsList>
          <TabsTrigger value="list" className="gap-2" data-testid="tab-list-view">
            <List className="h-4 w-4" />
            リスト
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2" data-testid="tab-calendar-view">
            <CalendarDays className="h-4 w-4" />
            カレンダー
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {MOCK_SCHEDULES.map((schedule) => {
              const attendance = getAttendanceCount(schedule.id);
              return (
                <Card key={schedule.id} className="border-0 shadow-lg hover-elevate transition-all" data-testid={`schedule-card-${schedule.id}`}>
                  <CardHeader className="space-y-0 pb-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl truncate">{schedule.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(schedule.date).toLocaleDateString('ja-JP')}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full">{schedule.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {schedule.startTime}
                          {schedule.endTime && ` - ${schedule.endTime}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{schedule.venue}</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                        <span className="text-xs text-muted-foreground">集合:</span>
                        <span className="text-sm font-semibold">{schedule.gatherTime}</span>
                      </div>
                    </div>
                    {schedule.notes && (
                      <p className="text-sm text-muted-foreground p-3 rounded-xl bg-muted/30">{schedule.notes}</p>
                    )}
                    
                    {/* 出席人数 */}
                    <div 
                      className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-600/10 cursor-pointer hover-elevate"
                      onClick={() => setSelectedSchedule(schedule.id)}
                      data-testid={`attendance-summary-${schedule.id}`}
                    >
                      <Users className="h-5 w-5 text-primary" />
                      <div className="flex gap-4 text-sm font-medium">
                        <span className="flex items-center gap-1">
                          <span className="text-green-600 dark:text-green-400">○</span>
                          <span data-testid={`count-present-${schedule.id}`}>{attendance.present}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-yellow-600 dark:text-yellow-400">△</span>
                          <span data-testid={`count-maybe-${schedule.id}`}>{attendance.maybe}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-red-600 dark:text-red-400">×</span>
                          <span data-testid={`count-absent-${schedule.id}`}>{attendance.absent}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3">
                      <Button variant="outline" size="sm" className="flex-1 rounded-xl" data-testid={`button-edit-${schedule.id}`}>
                        <Edit className="h-4 w-4 mr-2" />
                        編集
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-xl" data-testid={`button-delete-${schedule.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-8">
          <Card className="border-0 shadow-xl">
            <CardContent className="p-12">
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                <div className="text-center">
                  <div className="rounded-2xl bg-primary/10 p-6 inline-block mb-6">
                    <CalendarDays className="h-16 w-16 text-primary" />
                  </div>
                  <p className="text-lg">カレンダービューは準備中です</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
