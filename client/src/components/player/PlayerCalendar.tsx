import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Schedule, Attendance, Student } from "@shared/schema";
import { Separator } from "@/components/ui/separator";

interface StudentCalendarProps {
  studentId: string;
  selectedCategories: string[];
}

type ViewMode = "month" | "week";

export default function StudentCalendar({ studentId, selectedCategories }: StudentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

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
    return schedules.filter(s => s.date === dateStr);
  };

  const getAttendancesBySchedule = (scheduleId: string) => {
    return attendances.filter(a => a.scheduleId === scheduleId);
  };

  const getStudentName = (studentIdParam: string) => {
    const student = students.find(s => s.id === studentIdParam);
    return student?.name || "不明";
  };

  const handlePrevious = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNext = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
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
          const daySchedules = schedules.filter(s => s.date === dateStr);
          const today = new Date();
          const isCurrentDay = today.getFullYear() === date.getFullYear() &&
                          today.getMonth() === date.getMonth() &&
                          today.getDate() === date.getDate();

          return (
            <Card key={date.toISOString()} className={`border-0 shadow-lg ${isCurrentDay ? "border-2 border-primary" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className={`text-center min-w-[80px] ${
                    index === 0 ? "text-red-600" : index === 6 ? "text-blue-600" : ""
                  }`}>
                    <div className="text-xs font-semibold opacity-70">{weekDays[index]}</div>
                    <div className="text-2xl font-bold">{date.getDate()}</div>
                    <div className="text-xs opacity-70">
                      {date.getFullYear()}年{date.getMonth() + 1}月
                    </div>
                  </div>
                  <div className="flex-1 grid gap-2">
                    {daySchedules.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-4">予定なし</div>
                    ) : (
                      daySchedules.map((schedule) => {
                        const attendance = getAttendanceForSchedule(schedule.id);
                        const startTime = schedule.startHour !== null && schedule.startMinute !== null
                          ? `${String(schedule.startHour).padStart(2, '0')}:${String(schedule.startMinute).padStart(2, '0')}`
                          : "";
                        
                        return (
                          <div
                            key={schedule.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 cursor-pointer hover-elevate"
                            onClick={() => setSelectedSchedule(schedule)}
                            data-testid={`schedule-item-${schedule.id}`}
                          >
                            <Badge 
                              variant={
                                attendance?.status === "○" ? "default" : 
                                attendance?.status === "△" ? "secondary" : 
                                "outline"
                              }
                              className="min-w-[40px] justify-center text-base"
                            >
                              {attendance?.status || "-"}
                            </Badge>
                            <div className="flex-1">
                              <div className="font-semibold">{schedule.title}</div>
                              {startTime && (
                                <div className="text-xs text-muted-foreground">{startTime}</div>
                              )}
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

  const renderMonthView = () => {
    return (
      <div className="space-y-6">
        {/* Calendar Grid */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            {/* Week Days Header */}
            <div className="grid grid-cols-7 border-b">
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className={`p-3 text-center text-sm font-semibold ${
                    index === 0 ? "text-red-600" : index === 6 ? "text-blue-600" : "text-muted-foreground"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
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
                        return (
                          <div
                            key={schedule.id}
                            className="text-xs p-1 rounded bg-muted/30 truncate cursor-pointer"
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
                const today = isToday(day, 0);
                const dayOfWeek = (startingDayOfWeek + index) % 7;
                
                return (
                  <div
                    key={`current-${day}`}
                    className={`min-h-[100px] p-2 border-b border-r ${
                      today ? "bg-primary/5" : ""
                    } ${daySchedules.length > 0 ? "cursor-pointer" : ""}`}
                    data-testid={`calendar-day-${day}`}
                  >
                    <div
                      className={`text-sm mb-1 font-semibold ${
                        today
                          ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground"
                          : dayOfWeek === 0
                          ? "text-red-600"
                          : dayOfWeek === 6
                          ? "text-blue-600"
                          : ""
                      }`}
                    >
                      {day}
                    </div>
                    <div className="space-y-1">
                      {daySchedules.slice(0, 3).map((schedule) => {
                        const attendance = getAttendanceForSchedule(schedule.id);
                        const startTime = schedule.startHour !== null && schedule.startMinute !== null
                          ? `${String(schedule.startHour).padStart(2, '0')}:${String(schedule.startMinute).padStart(2, '0')}`
                          : "";
                        
                        return (
                          <div
                            key={schedule.id}
                            className="text-xs p-1.5 rounded border bg-muted/10 cursor-pointer hover-elevate"
                            data-testid={`schedule-${schedule.id}`}
                            onClick={() => setSelectedSchedule(schedule)}
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-bold">{attendance?.status || "-"}</span>
                              <span className="truncate flex-1">{schedule.title}</span>
                            </div>
                            {startTime && (
                              <div className="text-[10px] opacity-80 mt-0.5">{startTime}</div>
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
                        return (
                          <div
                            key={schedule.id}
                            className="text-xs p-1 rounded bg-muted/30 truncate cursor-pointer"
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
      </div>

      {/* Calendar Display */}
      {viewMode === "month" ? renderMonthView() : renderWeekView()}

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
                  <div>
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
