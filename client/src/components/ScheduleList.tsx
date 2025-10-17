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
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

const MOCK_ATTENDANCE = [
  // スケジュール1の出席
  { id: "a1", scheduleId: "1", studentId: "1", status: "present" },
  { id: "a2", scheduleId: "1", studentId: "2", status: "present" },
  { id: "a3", scheduleId: "1", studentId: "3", status: "maybe" },
  { id: "a4", scheduleId: "1", studentId: "7", status: "absent" },
  // スケジュール2の出席
  { id: "a5", scheduleId: "2", studentId: "4", status: "present" },
  { id: "a6", scheduleId: "2", studentId: "5", status: "present" },
  { id: "a7", scheduleId: "2", studentId: "6", status: "present" },
  { id: "a8", scheduleId: "2", studentId: "8", status: "maybe" },
  // スケジュール3の出席
  { id: "a9", scheduleId: "3", studentId: "1", status: "present" },
  { id: "a10", scheduleId: "3", studentId: "2", status: "present" },
  { id: "a11", scheduleId: "3", studentId: "3", status: "present" },
  { id: "a12", scheduleId: "3", studentId: "7", status: "maybe" },
] as const;

const MOCK_CATEGORIES = [
  { id: "cat-1", name: "U-12" },
  { id: "cat-2", name: "U-15" },
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
    studentCanRegister: true,
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
    studentCanRegister: false,
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
    studentCanRegister: true,
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
    studentCanRegister: true,
  },
];

export function ScheduleList() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["U-12", "U-15", "U-18", "全学年"]);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // 出席状況を集計
  const getAttendanceCount = (scheduleId: string) => {
    const attendances = MOCK_ATTENDANCE.filter(a => a.scheduleId === scheduleId);
    return {
      present: attendances.filter(a => a.status === "present").length,
      maybe: attendances.filter(a => a.status === "maybe").length,
      absent: attendances.filter(a => a.status === "absent").length,
    };
  };

  // カテゴリフィルター切り替え
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // フィルタリングされたスケジュール
  const filteredSchedules = MOCK_SCHEDULES.filter(schedule =>
    selectedCategories.includes(schedule.category)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">スケジュール管理</h1>
          <p className="text-muted-foreground mt-2 text-lg">日々の活動を登録・管理</p>
        </div>
        <Button 
          className="h-12 px-6 rounded-xl text-base" 
          onClick={() => setShowAddDialog(true)}
          data-testid="button-add-schedule"
        >
          <Plus className="h-5 w-5 mr-2" />
          新規追加
        </Button>
      </div>

      {/* カテゴリフィルター */}
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {["U-12", "U-15", "U-18", "全学年"].map((category) => (
              <div key={category} className="flex items-center gap-2">
                <Checkbox
                  id={`category-${category}`}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => toggleCategory(category)}
                  data-testid={`checkbox-category-${category}`}
                />
                <Label htmlFor={`category-${category}`} className="cursor-pointer font-medium">
                  {category}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
          <div className="space-y-6">
            {filteredSchedules.map((schedule) => {
              const attendance = getAttendanceCount(schedule.id);
              return (
                <Card key={schedule.id} className="border-0 shadow-lg hover-elevate transition-all" data-testid={`schedule-card-${schedule.id}`}>
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      {/* 左側: 日付表示 */}
                      <div className="flex flex-col items-center justify-center min-w-[100px] h-24 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white">
                        <div className="text-3xl font-bold">
                          {new Date(schedule.date).getDate()}
                        </div>
                        <div className="text-sm opacity-90">
                          {new Date(schedule.date).toLocaleDateString('ja-JP', { month: 'short', year: 'numeric' })}
                        </div>
                      </div>

                      {/* 右側: 詳細情報 */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold mb-2">{schedule.title}</h3>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="rounded-full">{schedule.category}</Badge>
                              <Badge 
                                variant={schedule.studentCanRegister ? "default" : "secondary"} 
                                className="rounded-full"
                                data-testid={`badge-register-${schedule.id}`}
                              >
                                {schedule.studentCanRegister ? "生徒登録可" : "コーチ指定"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
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
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                          <span className="text-xs text-muted-foreground">集合:</span>
                          <span className="text-sm font-semibold">{schedule.gatherTime}</span>
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

                        <div className="flex gap-3">
                          <Button variant="outline" size="sm" className="flex-1 rounded-xl" data-testid={`button-edit-${schedule.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            編集
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl" data-testid={`button-delete-${schedule.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-8">
          <Card className="border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="grid grid-cols-7 gap-4">
                {/* 曜日ヘッダー */}
                {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
                  <div key={day} className="text-center font-semibold text-sm text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
                
                {/* カレンダーの日付 */}
                {Array.from({ length: 35 }, (_, i) => {
                  const date = new Date(2024, 9, i - 5); // 2024年10月を基準
                  const daySchedules = filteredSchedules.filter(
                    s => new Date(s.date).toDateString() === date.toDateString()
                  );
                  const isCurrentMonth = date.getMonth() === 9; // 10月
                  
                  return (
                    <div
                      key={i}
                      className={`min-h-[100px] p-2 rounded-xl border ${
                        isCurrentMonth ? 'border-border bg-card' : 'border-transparent bg-muted/30'
                      }`}
                      data-testid={`calendar-day-${i}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {daySchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="text-xs p-1 rounded bg-primary/10 text-primary truncate cursor-pointer hover-elevate"
                            onClick={() => setSelectedSchedule(schedule.id)}
                            data-testid={`calendar-schedule-${schedule.id}`}
                          >
                            {schedule.startTime} {schedule.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 参加者詳細ポップアップ */}
      <Dialog open={!!selectedSchedule} onOpenChange={(open) => !open && setSelectedSchedule(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">参加者詳細</DialogTitle>
          </DialogHeader>
          {selectedSchedule && (() => {
            const schedule = MOCK_SCHEDULES.find(s => s.id === selectedSchedule);
            const participants = MOCK_ATTENDANCE
              .filter(a => a.scheduleId === selectedSchedule)
              .map(a => ({
                ...a,
                student: MOCK_STUDENTS.find(s => s.id === a.studentId)!
              }));

            return (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-600/10">
                  <h3 className="font-semibold text-lg mb-2">{schedule?.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {schedule?.date && new Date(schedule.date).toLocaleDateString('ja-JP')} {schedule?.startTime}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>参加者 {participants.length}名</span>
                  </div>

                  <div className="space-y-2">
                    {participants.map(({ student, status, studentId }) => (
                      <div 
                        key={student.id} 
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover-elevate"
                        data-testid={`participant-${student.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {status === 'present' && <span className="text-green-600 dark:text-green-400">○</span>}
                            {status === 'maybe' && <span className="text-yellow-600 dark:text-yellow-400">△</span>}
                            {status === 'absent' && <span className="text-red-600 dark:text-red-400">×</span>}
                          </span>
                          <span className="font-medium">{student.name}</span>
                          <Badge variant="outline" className="rounded-full text-xs">
                            {MOCK_CATEGORIES.find(c => c.id === student.categoryId)?.name}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-xl" data-testid={`button-move-${student.id}`}>
                              移動
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>移動先を選択（同日のみ）</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {MOCK_SCHEDULES.filter(s => 
                              s.id !== selectedSchedule && 
                              s.date === schedule?.date
                            ).length > 0 ? (
                              MOCK_SCHEDULES.filter(s => 
                                s.id !== selectedSchedule && 
                                s.date === schedule?.date
                              ).map(s => (
                                <DropdownMenuItem 
                                  key={s.id}
                                  onClick={() => {
                                    console.log(`Moving student ${studentId} to schedule ${s.id}`);
                                  }}
                                  data-testid={`move-to-${s.id}`}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{s.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {s.startTime}
                                    </span>
                                  </div>
                                </DropdownMenuItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                同じ日のイベントがありません
                              </div>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* 新規追加ダイアログ */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">スケジュール新規追加</DialogTitle>
            <DialogDescription>
              活動の詳細情報を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="title">タイトル *</Label>
                <Input
                  id="title"
                  placeholder="例: 週末練習"
                  data-testid="input-schedule-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">日付 *</Label>
                <Input
                  id="date"
                  type="date"
                  data-testid="input-schedule-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">カテゴリ *</Label>
                <Select>
                  <SelectTrigger data-testid="select-schedule-category">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="U-12">U-12</SelectItem>
                    <SelectItem value="U-15">U-15</SelectItem>
                    <SelectItem value="U-18">U-18</SelectItem>
                    <SelectItem value="全学年">全学年</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">開始時刻</Label>
                <Input
                  id="startTime"
                  type="time"
                  placeholder="10:00"
                  data-testid="input-schedule-start-time"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">終了時刻</Label>
                <Input
                  id="endTime"
                  type="time"
                  placeholder="12:00"
                  data-testid="input-schedule-end-time"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gatherTime">集合時刻 *</Label>
                <Input
                  id="gatherTime"
                  type="time"
                  placeholder="09:45"
                  data-testid="input-schedule-gather-time"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">活動場所 *</Label>
                <Input
                  id="venue"
                  placeholder="例: 中央グラウンド"
                  data-testid="input-schedule-venue"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="notes">備考</Label>
                <Textarea
                  id="notes"
                  placeholder="持ち物や注意事項など"
                  rows={3}
                  data-testid="input-schedule-notes"
                />
              </div>

              <div className="flex items-center space-x-3 col-span-2 p-4 rounded-xl bg-muted/50">
                <Checkbox 
                  id="studentCanRegister" 
                  defaultChecked
                  data-testid="checkbox-student-register"
                />
                <Label 
                  htmlFor="studentCanRegister" 
                  className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  生徒側から登録可能にする
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              data-testid="button-cancel-add"
            >
              キャンセル
            </Button>
            <Button
              onClick={() => {
                console.log('スケジュールを追加');
                setShowAddDialog(false);
              }}
              data-testid="button-save-schedule"
            >
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
