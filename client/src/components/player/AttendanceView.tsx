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
import { Calendar, MapPin, Clock } from "lucide-react";

interface AttendanceViewProps {
  studentId: string;
  selectedCategories: string[];
}

type AttendanceStatus = "○" | "△" | "×";

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

  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [savingScheduleId, setSavingScheduleId] = useState<string | null>(null);

  const getAttendanceForSchedule = (scheduleId: string) => {
    return attendances.find((att) => att.scheduleId === scheduleId);
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
    setSavingScheduleId(scheduleId);
    try {
      const status = getCurrentStatus(scheduleId);
      const comment = getCurrentComment(scheduleId);

      const response = await apiRequest("POST", `/api/student/${studentId}/attendance`, { scheduleId, status, comment });

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: [`/api/student/${studentId}/attendance`] });
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

  // 自分の所属カテゴリのスケジュールで、未回答かつコーチ指定でないもののみ表示
  const unansweredSchedules = schedules.filter(schedule => {
    // コーチ指定のスケジュールは除外
    if (schedule.studentCanRegister === false) {
      return false;
    }
    
    // 未回答のものだけ
    if (getAttendanceForSchedule(schedule.id)) {
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
        <CardContent className="py-8 text-center text-muted-foreground">
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

        return (
          <Card key={schedule.id} data-testid={`card-schedule-${schedule.id}`} className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold mb-3">{schedule.title}</CardTitle>
                  
                  {/* カテゴリーバッジ */}
                  {categoryNames.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {categoryNames.map((name, index) => (
                        <Badge 
                          key={index} 
                          className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30"
                          data-testid={`badge-category-${index}`}
                        >
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* 日付・時間情報 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium" data-testid={`text-schedule-date-${schedule.id}`}>
                        {format(new Date(schedule.date), "M月d日(E)", { locale: ja })}
                      </span>
                    </div>
                    
                    {schedule.startHour !== null && schedule.startMinute !== null && schedule.endHour !== null && schedule.endMinute !== null && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {String(schedule.startHour).padStart(2, '0')}:{String(schedule.startMinute).padStart(2, '0')} - {String(schedule.endHour).padStart(2, '0')}:{String(schedule.endMinute).padStart(2, '0')}
                        </span>
                        {schedule.gatherHour !== null && schedule.gatherMinute !== null && (
                          <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                            集合 {String(schedule.gatherHour).padStart(2, '0')}:{String(schedule.gatherMinute).padStart(2, '0')}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{schedule.venue || "未定"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-5">
              {/* 出欠状況 */}
              <div>
                <label className="text-sm font-semibold mb-3 block text-foreground">出欠状況を選択</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["○", "△", "×"] as AttendanceStatus[]).map((status) => {
                    const isSelected = currentStatus === status;
                    const buttonClass = isSelected 
                      ? status === "○" 
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg scale-105" 
                        : status === "△"
                        ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-lg scale-105"
                        : "bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 shadow-lg scale-105"
                      : "bg-card hover-elevate active-elevate-2";
                    
                    return (
                      <Button
                        key={status}
                        variant="outline"
                        size="lg"
                        onClick={() => handleStatusChange(schedule.id, status)}
                        data-testid={`button-status-${status}-${schedule.id}`}
                        className={`text-2xl font-bold h-16 transition-all ${buttonClass}`}
                      >
                        {status}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* コメント */}
              <div>
                <label className="text-sm font-semibold mb-3 block text-foreground">コメント（任意）</label>
                <Textarea
                  placeholder="遅刻・早退の理由などがあれば入力してください..."
                  value={currentComment}
                  onChange={(e) => handleCommentChange(schedule.id, e.target.value)}
                  data-testid={`textarea-comment-${schedule.id}`}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* 保存ボタン */}
              <Button
                onClick={() => handleSave(schedule.id)}
                disabled={savingScheduleId === schedule.id}
                data-testid={`button-save-${schedule.id}`}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
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
