import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, MapPin, Plus, Clock, FileText, Download, ArrowRight } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Schedule, Student, Category, Attendance, ScheduleFile, ActivityLog } from "@shared/schema";

interface DashboardStats {
  upcomingEvents: number;
  teamMembers: number;
  activeCoaches: number;
  schedules: Schedule[];
}

export function Dashboard() {
  const { toast } = useToast();
  const [schedulePeriod, setSchedulePeriod] = useState<string>("this-week");
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [moveParticipantData, setMoveParticipantData] = useState<{
    attendance: Attendance;
    fromSchedule: Schedule;
    studentName: string;
  } | null>(null);
  const [targetScheduleId, setTargetScheduleId] = useState("");
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

  // Fetch attendances (always needed for dashboard)
  const { data: attendances = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendances"],
    enabled: !!teamId,
  });

  // Fetch schedule files for schedule dialog
  const { data: scheduleFiles = [] } = useQuery<ScheduleFile[]>({
    queryKey: ["/api/schedule-files"],
    enabled: showScheduleDialog && !!teamId,
  });

  // Fetch activity logs
  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs", teamId],
    queryFn: async () => {
      const response = await fetch(`/api/activity-logs/${teamId}?limit=10`);
      if (!response.ok) throw new Error("Failed to fetch activity logs");
      return response.json();
    },
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

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "たった今";
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
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

  // 参加者数を取得
  const getAttendanceCount = (scheduleId: string) => {
    const scheduleAttendances = attendances.filter(a => a.scheduleId === scheduleId);
    return {
      present: scheduleAttendances.filter(a => a.status === "○").length,
      maybe: scheduleAttendances.filter(a => a.status === "△").length,
      absent: scheduleAttendances.filter(a => a.status === "×").length,
    };
  };

  // 同じ日のスケジュールを取得
  const getSameDaySchedules = () => {
    if (!selectedSchedule || !stats?.schedules) return [];
    const scheduleDate = new Date(selectedSchedule.date).toDateString();
    return stats.schedules.filter(s => 
      new Date(s.date).toDateString() === scheduleDate && s.id !== selectedSchedule.id
    );
  };

  // 参加者移動ダイアログを開く
  const openMoveParticipantDialog = (attendance: Attendance) => {
    const student = students.find(s => s.id === attendance.studentId);
    if (student && selectedSchedule) {
      setMoveParticipantData({
        attendance,
        fromSchedule: selectedSchedule,
        studentName: student.name,
      });
      setTargetScheduleId("");
    }
  };

  // 参加者移動ダイアログを閉じる
  const closeMoveParticipantDialog = () => {
    setMoveParticipantData(null);
    setTargetScheduleId("");
  };

  // 参加者移動ミューテーション
  const moveParticipantMutation = useMutation({
    mutationFn: async ({ attendanceId, scheduleId }: { attendanceId: string; scheduleId: string }) => {
      return await apiRequest("PUT", `/api/attendances/${attendanceId}`, { scheduleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats", teamId, schedulePeriod] });
      toast({
        title: "成功",
        description: "参加者を移動しました",
      });
      closeMoveParticipantDialog();
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "参加者の移動に失敗しました",
        variant: "destructive",
      });
    },
  });

  // 参加者を移動
  const handleParticipantMove = () => {
    if (moveParticipantData && targetScheduleId) {
      moveParticipantMutation.mutate({
        attendanceId: moveParticipantData.attendance.id,
        scheduleId: targetScheduleId,
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">ダッシュボード</h1>
        <p className="text-muted-foreground mt-2 text-lg">チームの活動状況を確認</p>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-col items-center space-y-0 pb-3 md:pb-4">
            <div className="rounded-xl bg-primary/10 p-2 md:p-3 mb-2">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <Select value={schedulePeriod} onValueChange={setSchedulePeriod}>
              <SelectTrigger className="w-full border-0 shadow-none p-0 h-auto text-center" data-testid="select-schedule-period">
                <SelectValue className="text-xs md:text-sm font-medium text-muted-foreground" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">今週の予定</SelectItem>
                <SelectItem value="next-week">来週の予定</SelectItem>
                <SelectItem value="this-month">今月の予定</SelectItem>
                <SelectItem value="next-month">来月の予定</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="text-center pb-3 md:pb-4">
            <div className="text-2xl md:text-4xl font-bold" data-testid="text-upcoming-events">
              {isLoadingStats ? "..." : stats?.upcomingEvents || 0}
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-lg cursor-pointer hover-elevate transition-all"
          onClick={() => setShowMembersDialog(true)}
          data-testid="card-team-members"
        >
          <CardHeader className="flex flex-col items-center space-y-0 pb-3 md:pb-4">
            <div className="rounded-xl bg-primary/10 p-2 md:p-3 mb-2">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground text-center">メンバー</CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-3 md:pb-4">
            <div className="text-2xl md:text-4xl font-bold" data-testid="text-team-members">
              {isLoadingStats ? "..." : stats?.teamMembers || 0}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden md:block">クリック</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-col items-center space-y-0 pb-3 md:pb-4">
            <div className="rounded-xl bg-primary/10 p-2 md:p-3 mb-2">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground text-center">コーチ</CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-3 md:pb-4">
            <div className="text-2xl md:text-4xl font-bold" data-testid="text-active-coaches">
              {isLoadingStats ? "..." : stats?.activeCoaches || 0}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">名</p>
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
                  const attendance = getAttendanceCount(schedule.id);
                  
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
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {categoryNames.length > 0 && (
                            <>
                              {categoryNames.map((name, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {name}
                                </Badge>
                              ))}
                            </>
                          )}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="flex items-center gap-1">
                              <span className="text-green-600 dark:text-green-400">○</span>
                              <span>{attendance.present}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-yellow-600 dark:text-yellow-400">△</span>
                              <span>{attendance.maybe}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-red-600 dark:text-red-400">×</span>
                              <span>{attendance.absent}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">タイムライン</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityLogs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                更新履歴がここに表示されます
              </div>
            ) : (
              activityLogs.slice(0, 5).map((log) => {
                const timeAgo = getTimeAgo(new Date(log.createdAt));
                const logCategoryIds = log.categoryIds || [];
                const categoryNames = logCategoryIds.map(catId => {
                  const category = categories.find(c => c.id === catId);
                  return category?.name || "";
                }).filter(name => name !== "");
                
                return (
                  <div 
                    key={log.id} 
                    className="p-2 rounded-lg bg-muted/30 hover-elevate min-h-9 flex items-center"
                    data-testid={`activity-log-${log.id}`}
                  >
                    <div className="text-sm flex items-center gap-2 flex-1">
                      <span>{log.description}</span>
                      {categoryNames.map((name, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs shrink-0">
                          {name}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
                    </div>
                  </div>
                );
              })
            )}
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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

              {/* 添付ファイル */}
              {scheduleFiles.filter(f => f.scheduleId === selectedSchedule.id).length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">添付ファイル</h4>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {scheduleFiles
                      .filter(f => f.scheduleId === selectedSchedule.id)
                      .map(file => {
                        const isImage = file.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        const isPDF = file.fileName.match(/\.pdf$/i);
                        
                        return (
                          <div 
                            key={file.id}
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover-elevate"
                          >
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{file.fileName}</p>
                              {file.fileSize && (
                                <p className="text-xs text-muted-foreground">
                                  {(parseInt(file.fileSize) / 1024 / 1024).toFixed(2)} MB
                                </p>
                              )}
                            </div>
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button size="sm" variant="ghost" data-testid={`download-file-${file.id}`}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          </div>
                        );
                      })}
                  </div>
                  
                  {/* 画像プレビュー */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {scheduleFiles
                      .filter(f => f.scheduleId === selectedSchedule.id && f.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                      .slice(0, 4)
                      .map(file => (
                        <a
                          key={file.id}
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative aspect-video rounded-lg overflow-hidden bg-muted hover-elevate"
                        >
                          <img
                            src={file.fileUrl}
                            alt={file.fileName}
                            className="w-full h-full object-cover"
                            data-testid={`preview-${file.id}`}
                          />
                        </a>
                      ))}
                  </div>
                </div>
              )}

              {/* 参加者リスト */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">参加者</h4>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {attendances
                    .filter(a => a.scheduleId === selectedSchedule.id)
                    .map(attendance => {
                      const student = students.find(s => s.id === attendance.studentId);
                      if (!student) return null;
                      
                      const statusIcon = attendance.status || "-";
                      
                      const sameDaySchedules = getSameDaySchedules();
                      
                      return (
                        <div 
                          key={attendance.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
                          data-testid={`participant-${student.id}`}
                        >
                          <span className="w-6 text-center font-semibold">{statusIcon}</span>
                          <span className="flex-1">{student.name}</span>
                          {attendance.comment && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {attendance.comment}
                            </span>
                          )}
                          {sameDaySchedules.length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openMoveParticipantDialog(attendance)}
                              data-testid={`button-move-participant-${student.id}`}
                              className="h-6 px-2"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  {attendances.filter(a => a.scheduleId === selectedSchedule.id).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      まだ参加登録がありません
                    </p>
                  )}
                </div>
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

      {/* 参加者移動ダイアログ */}
      <Dialog open={moveParticipantData !== null} onOpenChange={(open) => !open && closeMoveParticipantDialog()}>
        <DialogContent data-testid="dialog-move-participant">
          <DialogHeader>
            <DialogTitle>参加者を別のイベントに移動</DialogTitle>
            <DialogDescription>
              {moveParticipantData?.studentName} さんを別のイベントに移動します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-semibold">現在のイベント:</span> {moveParticipantData?.fromSchedule.title}
              </div>
              <div className="space-y-2 mt-4">
                <label className="text-sm font-semibold">移動先のイベント</label>
                <Select value={targetScheduleId} onValueChange={setTargetScheduleId}>
                  <SelectTrigger data-testid="select-target-schedule">
                    <SelectValue placeholder="イベントを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSameDaySchedules().map(schedule => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        {schedule.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeMoveParticipantDialog} data-testid="button-cancel-move">
              キャンセル
            </Button>
            <Button 
              onClick={handleParticipantMove} 
              disabled={!targetScheduleId || moveParticipantMutation.isPending} 
              data-testid="button-confirm-move"
            >
              {moveParticipantMutation.isPending ? "移動中..." : "移動する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
