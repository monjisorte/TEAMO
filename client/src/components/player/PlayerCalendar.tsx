import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { Schedule, Attendance, Student, Category } from "@shared/schema";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface StudentCalendarProps {
  studentId: string;
  teamId: string;
  selectedCategories: string[];
}

type ViewMode = "month" | "week" | "next";

export default function StudentCalendar({ studentId, teamId, selectedCategories }: StudentCalendarProps) {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);

  const { data: schedules = [] } = useQuery<Schedule[]>({
    queryKey: [`/api/student/${studentId}/schedules`],
    enabled: selectedCategories.length > 0,
  });

  const { data: attendances = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendances"],
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: [`/api/categories/${teamId}`],
  });

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

  // デフォルトで所属カテゴリを選択
  useEffect(() => {
    if (categories.length > 0 && visibleCategories.length === 0) {
      // 自分が所属しているカテゴリをデフォルトで選択
      setVisibleCategories(selectedCategories);
    }
  }, [categories, selectedCategories]);

  // カテゴリの表示/非表示を切り替え
  const toggleCategoryVisibility = (categoryId: string) => {
    setVisibleCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // フィルタリングされたスケジュール
  const filteredSchedules = schedules.filter(schedule => {
    const scheduleCategoryIds = getScheduleCategoryIds(schedule);
    return scheduleCategoryIds.some(catId => visibleCategories.includes(catId));
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async ({ scheduleId, status }: { scheduleId: string; status: string }) => {
      const existingAttendance = getAttendanceForSchedule(scheduleId);
      
      if (existingAttendance) {
        return await apiRequest("PUT", `/api/attendances/${existingAttendance.id}`, {
          status,
          comment: existingAttendance.comment || "",
        });
      } else {
        return await apiRequest("POST", "/api/attendances", {
          scheduleId,
          studentId,
          status,
          comment: "",
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/attendances"] });
      setSelectedSchedule(null);
      toast({
        title: "保存完了",
        description: "出欠を登録しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "保存に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleAttendanceChange = (scheduleId: string, status: string) => {
    saveAttendanceMutation.mutate({ scheduleId, status });
  };

  const getAttendanceForSchedule = (scheduleId: string, studentIdParam?: string) => {
    const targetStudentId = studentIdParam || studentId;
    return attendances.find((att) => att.scheduleId === scheduleId && att.studentId === targetStudentId);
  };

  const getSchedulesForDate = (year: number, month: number, day: number, monthOffset: number) => {
    const targetDate = new Date(year, month + monthOffset, day);
    const year_local = targetDate.getFullYear();
    const month_local = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day_local = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${year_local}-${month_local}-${day_local}`;
    return filteredSchedules.filter(s => s.date === dateStr);
  };

  const getAttendancesBySchedule = (scheduleId: string) => {
    return attendances.filter(a => a.scheduleId === scheduleId);
  };

  const getStudentName = (studentIdParam: string) => {
    const student = students.find(s => s.id === studentIdParam);
    return student?.name || "不明";
  };

  const getCategoryColor = (categoryId: string) => {
    const index = categories.findIndex(c => c.id === categoryId);
    const colors = [
      "bg-blue-500/10 text-blue-600 border-blue-500/20",
      "bg-purple-500/10 text-purple-600 border-purple-500/20",
      "bg-green-500/10 text-green-600 border-green-500/20",
      "bg-orange-500/10 text-orange-600 border-orange-500/20",
      "bg-pink-500/10 text-pink-600 border-pink-500/20",
      "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    ];
    return colors[index % colors.length] || colors[0];
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "不明";
  };

  const handlePrevious = () => {
    if (viewMode === "week") {
      // 週表示の場合は7日前に移動
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      // 月表示の場合は前月に移動
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === "week") {
      // 週表示の場合は7日後に移動
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      // 月表示の場合は翌月に移動
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (day: number, monthOffset: number) => {
    const today = new Date();
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, day);
    return (
      today.getFullYear() === targetDate.getFullYear() &&
      today.getMonth() === targetDate.getMonth() &&
      today.getDate() === targetDate.getDate()
    );
  };

  // カレンダーの日付を生成
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // 前月の末尾の日付
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevMonthDays = Array.from(
    { length: startingDayOfWeek },
    (_, i) => prevMonthLastDay - startingDayOfWeek + i + 1
  );

  // 当月の日付
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 次月の初めの日付（カレンダーを42日で埋める）
  const totalDays = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDays = Array.from({ length: 42 - totalDays }, (_, i) => i + 1);

  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  // 週表示を縦型で生成
  const renderWeekView = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // 週の始まり（日曜日）
    
    const weekDaysData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    });

    return (
      <div className="space-y-4">
        {weekDaysData.map((date, index) => {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const daySchedules = filteredSchedules.filter(s => s.date === dateStr);
          const today = new Date();
          const isCurrentDay = today.getFullYear() === date.getFullYear() &&
                          today.getMonth() === date.getMonth() &&
                          today.getDate() === date.getDate();

          return (
            <Card key={index} className={isCurrentDay ? "border-primary border-2" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Day Header */}
                  <div className="min-w-[80px]">
                    <div className="text-xs text-muted-foreground">{weekDays[index]}</div>
                    <div className={`text-2xl font-bold ${isCurrentDay ? "text-primary" : ""}`}>
                      {date.getDate()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {date.getMonth() + 1}月
                    </div>
                  </div>

                  {/* Events */}
                  <div className="flex-1 space-y-2">
                    {daySchedules.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2">
                        予定なし
                      </div>
                    ) : (
                      daySchedules.map((schedule) => {
                        const attendance = getAttendanceForSchedule(schedule.id);
                        const startTime = schedule.startHour !== null && schedule.startMinute !== null
                          ? `${String(schedule.startHour).padStart(2, '0')}:${String(schedule.startMinute).padStart(2, '0')}`
                          : null;
                        const categoryIds = getScheduleCategoryIds(schedule);
                        const primaryCategoryId = categoryIds[0];
                        const colorClasses = primaryCategoryId ? getCategoryColor(primaryCategoryId) : 'bg-muted/10 text-muted-foreground border-muted/20';

                        const endTime = schedule.endHour !== null && schedule.endMinute !== null
                          ? `${String(schedule.endHour).padStart(2, '0')}:${String(schedule.endMinute).padStart(2, '0')}`
                          : null;
                        const gatherTime = schedule.gatherHour !== null && schedule.gatherMinute !== null
                          ? `${String(schedule.gatherHour).padStart(2, '0')}:${String(schedule.gatherMinute).padStart(2, '0')}`
                          : null;
                        
                        return (
                          <div
                            key={schedule.id}
                            className={`p-3 rounded-lg border-2 ${colorClasses} hover-elevate cursor-pointer`}
                            onClick={() => setSelectedSchedule(schedule)}
                            data-testid={`week-schedule-${schedule.id}`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={
                                    attendance?.status === "○" ? "default" :
                                    attendance?.status === "△" ? "secondary" :
                                    "outline"
                                  }
                                  className="text-lg px-2"
                                >
                                  {attendance?.status || "-"}
                                </Badge>
                                <div className="font-medium flex-1">{schedule.title}</div>
                              </div>
                              
                              {/* Time and Location Info */}
                              <div className="text-sm opacity-80 space-y-0.5">
                                {startTime && (
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">時間:</span>
                                    <span>
                                      {startTime}
                                      {endTime && ` - ${endTime}`}
                                    </span>
                                  </div>
                                )}
                                {gatherTime && (
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">集合:</span>
                                    <span>{gatherTime}</span>
                                  </div>
                                )}
                                {schedule.venue && (
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">場所:</span>
                                    <span>{schedule.venue}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // 次回の予定を取得
  const getNextSchedule = (): Schedule | null => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // 今日以降の予定をフィルタして時系列でソート
    const upcomingSchedules = filteredSchedules
      .filter(schedule => {
        if (schedule.date > todayStr) return true;
        if (schedule.date === todayStr) {
          const scheduleMinutes = (schedule.startHour ?? 0) * 60 + (schedule.startMinute ?? 0);
          return scheduleMinutes > nowMinutes;
        }
        return false;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const aMinutes = (a.startHour ?? 0) * 60 + (a.startMinute ?? 0);
        const bMinutes = (b.startHour ?? 0) * 60 + (b.startMinute ?? 0);
        return aMinutes - bMinutes;
      });

    return upcomingSchedules.length > 0 ? upcomingSchedules[0] : null;
  };

  // 次回表示
  const renderNextView = () => {
    const nextSchedule = getNextSchedule();

    if (!nextSchedule) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground text-lg">次回の予定はありません</p>
          </CardContent>
        </Card>
      );
    }

    const attendance = getAttendanceForSchedule(nextSchedule.id);
    const scheduleAttendances = getAttendancesBySchedule(nextSchedule.id);
    const confirmedAttendances = scheduleAttendances.filter(a => a.status === "○");
    const maybeAttendances = scheduleAttendances.filter(a => a.status === "△");
    const absentAttendances = scheduleAttendances.filter(a => a.status === "×");

    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Schedule Title */}
            <div>
              <h3 className="text-xl font-bold mb-2">{nextSchedule.title}</h3>
              <Badge variant="outline" className="text-sm">次回の予定</Badge>
            </div>

            <Separator />

            {/* Schedule Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-1">日付</div>
                  <div className="text-base">
                    {nextSchedule.date.substring(0, 4)}年{nextSchedule.date.substring(5, 7)}月{nextSchedule.date.substring(8, 10)}日
                  </div>
                </div>
                
                {(nextSchedule.startHour !== null && nextSchedule.startMinute !== null) && (
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground mb-1">時間</div>
                    <div className="text-base">
                      {String(nextSchedule.startHour).padStart(2, '0')}:{String(nextSchedule.startMinute).padStart(2, '0')}
                      {nextSchedule.endHour !== null && nextSchedule.endMinute !== null && 
                        ` - ${String(nextSchedule.endHour).padStart(2, '0')}:${String(nextSchedule.endMinute).padStart(2, '0')}`}
                    </div>
                  </div>
                )}

                {(nextSchedule.gatherHour !== null && nextSchedule.gatherMinute !== null) && (
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground mb-1">集合時間</div>
                    <div className="text-base">
                      {String(nextSchedule.gatherHour).padStart(2, '0')}:{String(nextSchedule.gatherMinute).padStart(2, '0')}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-1">会場</div>
                  <div className="text-base">
                    {nextSchedule.venue && nextSchedule.venue !== "未定" ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextSchedule.venue)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                        data-testid="link-next-schedule-venue"
                      >
                        {nextSchedule.venue}
                      </a>
                    ) : (
                      <span>{nextSchedule.venue || "未定"}</span>
                    )}
                  </div>
                </div>
              </div>

              {nextSchedule.notes && (
                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-1">備考</div>
                  <div className="text-base whitespace-pre-wrap">{nextSchedule.notes}</div>
                </div>
              )}
            </div>

            <Separator />

            {/* Your Attendance */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">あなたの出欠: </span>
                <Badge 
                  variant={
                    attendance?.status === "○" ? "default" :
                    attendance?.status === "△" ? "secondary" :
                    "outline"
                  }
                  className="text-base px-3 py-1"
                >
                  {attendance?.status || "未回答"}
                </Badge>
                {nextSchedule.studentCanRegister === false && (
                  <Badge variant="secondary" className="text-xs">
                    コーチ指定
                  </Badge>
                )}
              </div>
              
              {/* Attendance Buttons */}
              {nextSchedule.studentCanRegister !== false ? (
                <div className="flex gap-2">
                  <Button
                    variant={attendance?.status === "○" ? "default" : "outline"}
                    onClick={() => handleAttendanceChange(nextSchedule.id, "○")}
                    disabled={saveAttendanceMutation.isPending}
                    data-testid="button-next-attendance-yes"
                  >
                    ○ 参加
                  </Button>
                  <Button
                    variant={attendance?.status === "△" ? "default" : "outline"}
                    onClick={() => handleAttendanceChange(nextSchedule.id, "△")}
                    disabled={saveAttendanceMutation.isPending}
                    data-testid="button-next-attendance-maybe"
                  >
                    △ 未定
                  </Button>
                  <Button
                    variant={attendance?.status === "×" ? "default" : "outline"}
                    onClick={() => handleAttendanceChange(nextSchedule.id, "×")}
                    disabled={saveAttendanceMutation.isPending}
                    data-testid="button-next-attendance-no"
                  >
                    × 欠席
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  このイベントはコーチ指定のため、出欠の変更はできません
                </p>
              )}
            </div>

            <Separator />

            {/* Participants */}
            <div className="space-y-3">
              <h4 className="font-semibold text-base">参加者情報</h4>
              
              <div className="grid gap-3">
                {/* Confirmed */}
                {confirmedAttendances.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default" className="bg-green-500">
                        ○ 参加 ({confirmedAttendances.length}名)
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {confirmedAttendances.map(att => (
                        <Badge key={att.id} variant="outline">
                          {getStudentName(att.studentId)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Maybe */}
                {maybeAttendances.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default" className="bg-yellow-500">
                        △ 未定 ({maybeAttendances.length}名)
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {maybeAttendances.map(att => (
                        <Badge key={att.id} variant="outline">
                          {getStudentName(att.studentId)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Absent */}
                {absentAttendances.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default" className="bg-red-500">
                        × 欠席 ({absentAttendances.length}名)
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {absentAttendances.map(att => (
                        <Badge key={att.id} variant="outline">
                          {getStudentName(att.studentId)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {scheduleAttendances.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    まだ出欠登録がありません
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 月表示
  const renderMonthView = () => {
    return (
      <div>
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7">
              {/* Week Day Headers */}
              {weekDays.map((day, index) => (
                <div
                  key={`header-${index}`}
                  className={`p-3 text-center font-semibold border-b border-r ${
                    index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : ""
                  }`}
                >
                  {day}
                </div>
              ))}

              {/* Previous Month Days */}
              {prevMonthDays.map((day, index) => {
                const daySchedules = getSchedulesForDate(year, month, day, -1);
                return (
                  <div
                    key={`prev-${index}`}
                    className="min-h-[100px] p-2 border-b border-r text-muted-foreground/30"
                    data-testid={`calendar-day-prev-${day}`}
                  >
                    <div className="text-sm mb-1">{day}</div>
                    <div className="space-y-1">
                      {daySchedules.slice(0, 2).map((schedule) => {
                        const attendance = getAttendanceForSchedule(schedule.id);
                        const categoryIds = getScheduleCategoryIds(schedule);
                        const primaryCategoryId = categoryIds[0];
                        const colorClasses = primaryCategoryId ? getCategoryColor(primaryCategoryId) : 'bg-muted/10 text-muted-foreground border-muted/20';
                        
                        return (
                          <div
                            key={schedule.id}
                            className={`text-xs p-1 rounded border ${colorClasses} truncate cursor-pointer opacity-50`}
                            onClick={() => setSelectedSchedule(schedule)}
                          >
                            <span className="font-semibold mr-1">{attendance?.status || "-"}</span>
                            {schedule.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Current Month Days */}
              {currentMonthDays.map((day, index) => {
                const daySchedules = getSchedulesForDate(year, month, day, 0);
                const isTodayCell = isToday(day, 0);
                return (
                  <div
                    key={`current-${index}`}
                    className={`min-h-[100px] p-2 border-b border-r ${
                      isTodayCell ? "bg-primary/5 border-primary" : ""
                    }`}
                    data-testid={`calendar-day-${day}`}
                  >
                    <div className={`text-sm mb-1 font-medium ${isTodayCell ? "text-primary" : ""}`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {daySchedules.slice(0, 3).map((schedule) => {
                        const attendance = getAttendanceForSchedule(schedule.id);
                        const startTime = schedule.startHour !== null && schedule.startMinute !== null
                          ? `${String(schedule.startHour).padStart(2, '0')}:${String(schedule.startMinute).padStart(2, '0')}`
                          : null;
                        const categoryIds = getScheduleCategoryIds(schedule);
                        const primaryCategoryId = categoryIds[0];
                        const colorClasses = primaryCategoryId ? getCategoryColor(primaryCategoryId) : 'bg-muted/10 text-muted-foreground border-muted/20';

                        return (
                          <div
                            key={schedule.id}
                            className={`text-xs p-1.5 rounded border ${colorClasses} cursor-pointer hover-elevate`}
                            data-testid={`schedule-${schedule.id}`}
                            onClick={() => setSelectedSchedule(schedule)}
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-bold">{attendance?.status || "-"}</span>
                              <span className="truncate flex-1">{schedule.title}</span>
                            </div>
                            {startTime && (
                              <div className="text-[10px] opacity-70 mt-0.5">{startTime}</div>
                            )}
                          </div>
                        );
                      })}
                      {daySchedules.length > 3 && (
                        <div className="text-xs text-muted-foreground pl-1">
                          +{daySchedules.length - 3}件
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Next Month Days */}
              {nextMonthDays.map((day, index) => {
                const daySchedules = getSchedulesForDate(year, month, day, 1);
                return (
                  <div
                    key={`next-${index}`}
                    className="min-h-[100px] p-2 border-b border-r text-muted-foreground/30"
                    data-testid={`calendar-day-next-${day}`}
                  >
                    <div className="text-sm mb-1">{day}</div>
                    <div className="space-y-1">
                      {daySchedules.slice(0, 2).map((schedule) => {
                        const attendance = getAttendanceForSchedule(schedule.id);
                        const categoryIds = getScheduleCategoryIds(schedule);
                        const primaryCategoryId = categoryIds[0];
                        const colorClasses = primaryCategoryId ? getCategoryColor(primaryCategoryId) : 'bg-muted/10 text-muted-foreground border-muted/20';
                        
                        return (
                          <div
                            key={schedule.id}
                            className={`text-xs p-1 rounded border ${colorClasses} truncate cursor-pointer opacity-50`}
                            onClick={() => setSelectedSchedule(schedule)}
                          >
                            <span className="font-semibold mr-1">{attendance?.status || "-"}</span>
                            {schedule.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">
            {year}年 {month + 1}月
          </h2>
          <Button variant="outline" size="sm" onClick={handleToday} data-testid="button-today">
            今日
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            data-testid="button-calendar-prev"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            data-testid="button-calendar-next"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            onClick={() => setViewMode("month")}
            data-testid="button-view-month"
          >
            月
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            onClick={() => setViewMode("week")}
            data-testid="button-view-week"
          >
            週
          </Button>
          <Button
            variant={viewMode === "next" ? "default" : "outline"}
            onClick={() => setViewMode("next")}
            data-testid="button-view-next"
          >
            次回
          </Button>
        </div>
        
        {/* Category Filter */}
        {categories.length > 0 && viewMode !== "next" && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">カテゴリ:</span>
            {categories.map((category) => {
              const isVisible = visibleCategories.includes(category.id);
              return (
                <Badge
                  key={category.id}
                  variant="outline"
                  className={`rounded-full cursor-pointer transition-all ${
                    isVisible 
                      ? getCategoryColor(category.id) 
                      : 'bg-muted/50 text-muted-foreground/50 border-muted'
                  }`}
                  onClick={() => toggleCategoryVisibility(category.id)}
                  data-testid={`badge-category-${category.id}`}
                >
                  <span className="flex items-center gap-1">
                    {isVisible && <Check className="w-3 h-3" />}
                    {category.name}
                  </span>
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar Display */}
      {viewMode === "month" ? renderMonthView() : viewMode === "week" ? renderWeekView() : renderNextView()}

      {/* Schedule Details Dialog */}
      <Dialog open={!!selectedSchedule} onOpenChange={() => setSelectedSchedule(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-schedule-details">
          {selectedSchedule && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSchedule.title}</DialogTitle>
                <DialogDescription>
                  スケジュール詳細と参加者情報
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Category and Registration Type Badges */}
                <div className="flex flex-wrap gap-2">
                  {getScheduleCategoryIds(selectedSchedule).map((categoryId) => (
                    <Badge key={categoryId} className={getCategoryColor(categoryId)}>
                      {getCategoryName(categoryId)}
                    </Badge>
                  ))}
                  {selectedSchedule.studentCanRegister === false ? (
                    <Badge variant="secondary" className="rounded-full">
                      コーチ指定
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-full">
                      生徒登録可
                    </Badge>
                  )}
                </div>

                {/* Schedule Info */}
                <div className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-muted-foreground min-w-[80px]">日付:</span>
                      <span>{selectedSchedule.date.substring(0, 4)}年{selectedSchedule.date.substring(5, 7)}月{selectedSchedule.date.substring(8, 10)}日</span>
                    </div>
                    {(selectedSchedule.startHour !== null && selectedSchedule.startMinute !== null) && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-muted-foreground min-w-[80px]">時間:</span>
                        <span>
                          {String(selectedSchedule.startHour).padStart(2, '0')}:{String(selectedSchedule.startMinute).padStart(2, '0')}
                          {selectedSchedule.endHour !== null && selectedSchedule.endMinute !== null && 
                            ` - ${String(selectedSchedule.endHour).padStart(2, '0')}:${String(selectedSchedule.endMinute).padStart(2, '0')}`}
                        </span>
                      </div>
                    )}
                    {(selectedSchedule.gatherHour !== null && selectedSchedule.gatherMinute !== null) && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-muted-foreground min-w-[80px]">集合時間:</span>
                        <span>{String(selectedSchedule.gatherHour).padStart(2, '0')}:{String(selectedSchedule.gatherMinute).padStart(2, '0')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-muted-foreground min-w-[80px]">会場:</span>
                      {selectedSchedule.venue && selectedSchedule.venue !== "未定" ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedSchedule.venue)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                          data-testid="link-schedule-venue"
                        >
                          {selectedSchedule.venue}
                        </a>
                      ) : (
                        <span>{selectedSchedule.venue || "未定"}</span>
                      )}
                    </div>
                    {selectedSchedule.notes && (
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-muted-foreground min-w-[80px]">備考:</span>
                        <span className="flex-1 whitespace-pre-wrap">{selectedSchedule.notes}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Your Attendance */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">あなたの出欠: </span>
                      <Badge 
                        variant={
                          getAttendanceForSchedule(selectedSchedule.id)?.status === "○" ? "default" :
                          getAttendanceForSchedule(selectedSchedule.id)?.status === "△" ? "secondary" :
                          "outline"
                        }
                        className="text-base px-3"
                      >
                        {getAttendanceForSchedule(selectedSchedule.id)?.status || "未回答"}
                      </Badge>
                      {selectedSchedule.studentCanRegister === false && (
                        <Badge variant="secondary" className="text-xs">
                          コーチ指定
                        </Badge>
                      )}
                    </div>
                    
                    {/* Attendance Buttons */}
                    {selectedSchedule.studentCanRegister !== false ? (
                      <div className="flex gap-2">
                        <Button
                          variant={getAttendanceForSchedule(selectedSchedule.id)?.status === "○" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAttendanceChange(selectedSchedule.id, "○")}
                          disabled={saveAttendanceMutation.isPending}
                          data-testid="button-attendance-yes"
                        >
                          ○ 参加
                        </Button>
                        <Button
                          variant={getAttendanceForSchedule(selectedSchedule.id)?.status === "△" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAttendanceChange(selectedSchedule.id, "△")}
                          disabled={saveAttendanceMutation.isPending}
                          data-testid="button-attendance-maybe"
                        >
                          △ 未定
                        </Button>
                        <Button
                          variant={getAttendanceForSchedule(selectedSchedule.id)?.status === "×" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAttendanceChange(selectedSchedule.id, "×")}
                          disabled={saveAttendanceMutation.isPending}
                          data-testid="button-attendance-no"
                        >
                          × 欠席
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        このイベントはコーチ指定のため、出欠の変更はできません
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Other Participants */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">参加者情報</h4>
                    
                    {(() => {
                      const scheduleAttendances = getAttendancesBySchedule(selectedSchedule.id);
                      const confirmedAttendances = scheduleAttendances.filter(a => a.status === "○");
                      const maybeAttendances = scheduleAttendances.filter(a => a.status === "△");
                      const absentAttendances = scheduleAttendances.filter(a => a.status === "×");

                      return (
                        <div className="grid gap-3">
                          {/* Confirmed */}
                          {confirmedAttendances.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="default" className="bg-green-500">
                                  ○ 参加 ({confirmedAttendances.length}名)
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {confirmedAttendances.map(attendance => (
                                  <Badge key={attendance.id} variant="outline">
                                    {getStudentName(attendance.studentId)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Maybe */}
                          {maybeAttendances.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="default" className="bg-yellow-500">
                                  △ 未定 ({maybeAttendances.length}名)
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {maybeAttendances.map(attendance => (
                                  <Badge key={attendance.id} variant="outline">
                                    {getStudentName(attendance.studentId)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Absent */}
                          {absentAttendances.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="default" className="bg-red-500">
                                  × 欠席 ({absentAttendances.length}名)
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {absentAttendances.map(attendance => (
                                  <Badge key={attendance.id} variant="outline">
                                    {getStudentName(attendance.studentId)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {scheduleAttendances.length === 0 && (
                            <div className="text-sm text-muted-foreground text-center py-4">
                              まだ出欠登録がありません
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
