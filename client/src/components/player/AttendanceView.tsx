import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Schedule, Attendance, Student, Category } from "@shared/schema";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, MapPin, Clock, Check, AlertCircle, X as XIcon } from "lucide-react";

interface AttendanceViewProps {
  studentId: string;
  selectedCategories: string[];
}

type AttendanceStatus = "○" | "△" | "×" | "-";

export default function AttendanceView({ studentId, selectedCategories }: AttendanceViewProps) {
  const { toast } = useToast();

  // Get student data to fetch teamId
  const { data: student } = useQuery<Student>({
    queryKey: [`/api/student/${studentId}`],
  });

  // Get categories for the team
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: [`/api/categories/${student?.teamId}`],
    enabled: !!student?.teamId,
  });

  const { data: schedules = [] } = useQuery<Schedule[]>({
    queryKey: [`/api/student/${studentId}/schedules`],
    enabled: selectedCategories.length > 0,
  });

  const { data: attendances = [] } = useQuery<Attendance[]>({
    queryKey: [`/api/student/${studentId}/attendance`],
  });

  // すべてのattendancesを取得して参加者数を表示
  const { data: allAttendances = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendances"],
  });

  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [savingScheduleId, setSavingScheduleId] = useState<string | null>(null);

  const getAttendanceForSchedule = (scheduleId: string) => {
    return attendances.find((att) => att.scheduleId === scheduleId);
  };

  const getAttendanceCounts = (scheduleId: string) => {
    const scheduleAttendances = allAttendances.filter(a => a.scheduleId === scheduleId);
    return {
      confirmed: scheduleAttendances.filter(a => a.status === "○").length,
      maybe: scheduleAttendances.filter(a => a.status === "△").length,
      absent: scheduleAttendances.filter(a => a.status === "×").length,
    };
  };

  const getCurrentStatus = (scheduleId: string): AttendanceStatus => {
    if (statusMap[scheduleId]) return statusMap[scheduleId];
    const existing = getAttendanceForSchedule(scheduleId);
    return (existing?.status as AttendanceStatus) || "-";
  };

  const getCurrentComment = (scheduleId: string): string => {
    if (commentMap[scheduleId] !== undefined) return commentMap[scheduleId];
    const existing = getAttendanceForSchedule(scheduleId);
    return existing?.comment || "";
  };

  const handleStatusChange = (scheduleId: string, status: AttendanceStatus) => {
    setStatusMap((prev) => ({ ...prev, [scheduleId]: status }));
  };

  const handleCommentChange = (scheduleId: string, comment: string) => {
    setCommentMap((prev) => ({ ...prev, [scheduleId]: comment }));
  };

  const handleSave = async (scheduleId: string) => {
    const status = getCurrentStatus(scheduleId);
    
    // 未選択の場合は保存できないようにする
    if (status === "-") {
      toast({
        title: "エラー",
        description: "出欠状況を選択してください",
        variant: "destructive",
      });
      return;
    }

    setSavingScheduleId(scheduleId);
    try {
      const comment = getCurrentComment(scheduleId);

      const response = await apiRequest("POST", `/api/student/${studentId}/attendance`, { scheduleId, status, comment });

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: [`/api/student/${studentId}/attendance`] });
        await queryClient.invalidateQueries({ queryKey: ["/api/attendances"] });
        toast({
          title: "保存成功",
          description: "出欠情報を保存しました",
        });
      } else {
        toast({
          title: "エラー",
          description: "保存中にエラーが発生しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "保存中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setSavingScheduleId(null);
    }
  };

  // スケジュールのカテゴリIDを取得するヘルパー関数
  const getScheduleCategoryIds = (schedule: Schedule): string[] => {
    if (schedule.categoryIds && schedule.categoryIds.length > 0) {
      return schedule.categoryIds;
    }
    if (schedule.categoryId) {
      return [schedule.categoryId];
    }
    return [];
  };

  // カテゴリーIDからカテゴリー名を取得するヘルパー関数
  const getCategoryNames = (categoryIds: string[]): string[] => {
    return categoryIds
      .map(id => categories.find(cat => cat.id === id)?.name)
      .filter((name): name is string => !!name);
  };

  // 自分の所属カテゴリのスケジュールで、未回答かつコーチ指定でないもの、かつ開始前のもののみ表示
  const unansweredSchedules = schedules.filter(schedule => {
    // コーチ指定のスケジュールは除外
    if (schedule.studentCanRegister === false) {
      return false;
    }
    
    // 未回答のものだけ
    if (getAttendanceForSchedule(schedule.id)) {
      return false;
    }
    
    // 開始済みのスケジュールは除外
    const now = new Date();
    const [year, month, day] = schedule.date.split('-').map(Number);
    const scheduleDateTime = new Date(year, month - 1, day, schedule.startHour || 0, schedule.startMinute || 0);
    if (scheduleDateTime <= now) {
      return false;
    }
    
    // 自分の所属カテゴリのスケジュールのみ
    const scheduleCategoryIds = getScheduleCategoryIds(schedule);
    return scheduleCategoryIds.some(catId => selectedCategories.includes(catId));
  });

  const sortedSchedules = [...unansweredSchedules].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  if (unansweredSchedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-4 text-center text-muted-foreground text-sm">
          {schedules.length === 0 ? "スケジュールがありません" : "未回答のスケジュールはありません"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {sortedSchedules.map((schedule) => {
        const currentStatus = getCurrentStatus(schedule.id);
        const currentComment = getCurrentComment(schedule.id);
        const scheduleCategoryIds = getScheduleCategoryIds(schedule);
        const categoryNames = getCategoryNames(scheduleCategoryIds);
        const attendanceCounts = getAttendanceCounts(schedule.id);

        return (
          <Card key={schedule.id} data-testid={`card-schedule-${schedule.id}`} className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-4 text-foreground">
              <div className="space-y-3">
                {/* タイトルと参加人数 */}
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-xl font-bold flex-1">{schedule.title}</CardTitle>
                  <div className="flex items-center gap-2 shrink-0 bg-white/80 dark:bg-slate-900/80 rounded-full px-3 py-1">
                    <div className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-semibold">{attendanceCounts.confirmed}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-semibold">{attendanceCounts.maybe}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XIcon className="w-3 h-3 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-semibold">{attendanceCounts.absent}</span>
                    </div>
                  </div>
                </div>
                
                {/* カテゴリーバッジ */}
                {categoryNames.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {categoryNames.map((name, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="text-xs font-medium"
                        data-testid={`badge-category-${index}`}
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* 日付・時間・場所情報 */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold" data-testid={`text-schedule-date-${schedule.id}`}>
                      {format(new Date(schedule.date), "M月d日(E)", { locale: ja })}
                    </span>
                  </div>
                  
                  {schedule.startHour !== null && schedule.startMinute !== null && schedule.endHour !== null && schedule.endMinute !== null && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="font-medium">
                        {String(schedule.startHour).padStart(2, '0')}:{String(schedule.startMinute).padStart(2, '0')} - {String(schedule.endHour).padStart(2, '0')}:{String(schedule.endMinute).padStart(2, '0')}
                      </span>
                      {schedule.gatherHour !== null && schedule.gatherMinute !== null && (
                        <span className="text-xs text-muted-foreground">
                          (集合 {String(schedule.gatherHour).padStart(2, '0')}:{String(schedule.gatherMinute).padStart(2, '0')})
                        </span>
                      )}
                    </div>
                  )}
                  
                  {schedule.venue ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(schedule.venue)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover-elevate rounded px-2 py-1 transition-all w-fit"
                      data-testid={`link-venue-${schedule.id}`}
                    >
                      <MapPin className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="font-medium underline decoration-dotted underline-offset-2">{schedule.venue}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-muted-foreground">未定</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <CardContent className="p-4 space-y-4">
              {/* 出欠状況 */}
              <div>
                <label className="text-sm font-semibold mb-2 block text-foreground">出欠状況を選択</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["○", "△", "×"] as AttendanceStatus[]).map((status) => {
                    const isSelected = currentStatus === status;
                    
                    const getStatusConfig = () => {
                      switch(status) {
                        case "○":
                          return {
                            icon: Check,
                            label: "参加",
                            selectedClass: "bg-gradient-to-br from-blue-500 to-purple-600 text-white border-blue-600 shadow-lg",
                            defaultClass: "border-blue-200 dark:border-blue-800"
                          };
                        case "△":
                          return {
                            icon: AlertCircle,
                            label: "未定",
                            selectedClass: "bg-gradient-to-br from-yellow-500 to-orange-500 text-white border-yellow-600 shadow-lg",
                            defaultClass: "border-yellow-200 dark:border-yellow-800"
                          };
                        case "×":
                          return {
                            icon: XIcon,
                            label: "欠席",
                            selectedClass: "bg-gradient-to-br from-red-500 to-rose-600 text-white border-red-600 shadow-lg",
                            defaultClass: "border-red-200 dark:border-red-800"
                          };
                        default:
                          return {
                            icon: Check,
                            label: "参加",
                            selectedClass: "bg-gradient-to-br from-blue-500 to-purple-600 text-white border-blue-600 shadow-lg",
                            defaultClass: "border-blue-200 dark:border-blue-800"
                          };
                      }
                    };
                    
                    const config = getStatusConfig();
                    const Icon = config.icon;
                    
                    return (
                      <Button
                        key={status}
                        variant="outline"
                        onClick={() => handleStatusChange(schedule.id, status)}
                        data-testid={`button-status-${status}-${schedule.id}`}
                        className={`flex flex-col items-center justify-center h-20 gap-1 transition-all ${
                          isSelected 
                            ? config.selectedClass 
                            : `bg-card hover-elevate active-elevate-2 ${config.defaultClass}`
                        }`}
                      >
                        <Icon className={`w-6 h-6 ${isSelected ? '' : 'opacity-60'}`} />
                        <span className="text-xs font-semibold">{config.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* コメント */}
              <div>
                <label className="text-sm font-semibold mb-2 block text-foreground">コメント（任意）</label>
                <Textarea
                  placeholder="遅刻・早退の理由などがあれば入力してください..."
                  value={currentComment}
                  onChange={(e) => handleCommentChange(schedule.id, e.target.value)}
                  data-testid={`textarea-comment-${schedule.id}`}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>

              {/* 保存ボタン */}
              <Button
                onClick={() => handleSave(schedule.id)}
                disabled={savingScheduleId === schedule.id}
                data-testid={`button-save-${schedule.id}`}
                size="lg"
                className="w-full font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
              >
                {savingScheduleId === schedule.id ? "保存中..." : "保存する"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
