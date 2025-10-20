import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import type { Schedule, Category, Attendance, Student } from "@shared/schema";

interface CalendarViewProps {
  schedules: Schedule[];
  categories: Category[];
  attendances: Attendance[];
  students: Student[];
  onScheduleClick?: (schedule: Schedule) => void;
  onParticipantMove?: (attendanceId: string, newScheduleId: string) => void;
  onDeleteSchedule?: (schedule: Schedule) => void;
}

export function CalendarView({ schedules, categories, attendances, students, onScheduleClick, onParticipantMove, onDeleteSchedule }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDaySchedules, setSelectedDaySchedules] = useState<Schedule[]>([]);
  const [moveParticipantData, setMoveParticipantData] = useState<{
    attendance: Attendance;
    fromSchedule: Schedule;
    studentName: string;
  } | null>(null);
  const [targetScheduleId, setTargetScheduleId] = useState("");

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "未分類";
  };

  const getScheduleCategoryIds = (schedule: Schedule): string[] => {
    if (schedule.categoryIds && schedule.categoryIds.length > 0) {
      return schedule.categoryIds;
    }
    if (schedule.categoryId) {
      return [schedule.categoryId];
    }
    return [];
  };

  const getAttendanceCount = (scheduleId: string) => {
    if (!attendances || attendances.length === 0) return 0;
    const scheduleAttendances = attendances.filter(a => a.scheduleId === scheduleId);
    const confirmedCount = scheduleAttendances.filter(a => a.status === "○").length;
    return confirmedCount;
  };

  const getAttendancesBySchedule = (scheduleId: string) => {
    if (!attendances || attendances.length === 0) return [];
    return attendances.filter(a => a.scheduleId === scheduleId);
  };

  const getStudentName = (studentId: string) => {
    if (!students || students.length === 0) return "不明";
    const student = students.find(s => s.id === studentId);
    return student?.name || "不明";
  };

  const handleDateClick = (day: number, monthOffset: number) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, day);
    const daySchedules = getSchedulesForDate(day, monthOffset);
    
    if (daySchedules.length > 0) {
      setSelectedDate(targetDate);
      setSelectedDaySchedules(daySchedules);
    }
  };

  const closeDialog = () => {
    setSelectedDate(null);
    setSelectedDaySchedules([]);
  };

  const openMoveParticipantDialog = (attendance: Attendance, fromSchedule: Schedule) => {
    const student = students.find(s => s.id === attendance.studentId);
    if (student) {
      setMoveParticipantData({
        attendance,
        fromSchedule,
        studentName: student.name,
      });
      setTargetScheduleId("");
    }
  };

  const closeMoveParticipantDialog = () => {
    setMoveParticipantData(null);
    setTargetScheduleId("");
  };

  const handleParticipantMove = () => {
    if (moveParticipantData && targetScheduleId && onParticipantMove) {
      onParticipantMove(moveParticipantData.attendance.id, targetScheduleId);
      closeMoveParticipantDialog();
    }
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

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
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

  // 各日付のスケジュールを取得
  const getSchedulesForDate = (day: number, monthOffset: number) => {
    const targetDate = new Date(year, month + monthOffset, day);
    // Use local timezone to avoid date shifting
    const year_local = targetDate.getFullYear();
    const month_local = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day_local = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${year_local}-${month_local}-${day_local}`;
    return schedules.filter(s => s.date === dateStr);
  };

  const isToday = (day: number, monthOffset: number) => {
    const today = new Date();
    const targetDate = new Date(year, month + monthOffset, day);
    return (
      today.getFullYear() === targetDate.getFullYear() &&
      today.getMonth() === targetDate.getMonth() &&
      today.getDate() === targetDate.getDate()
    );
  };

  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">
            {year}年 {month + 1}月
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
            今日
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousMonth}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
              const daySchedules = getSchedulesForDate(day, -1);
              return (
                <div
                  key={`prev-${index}`}
                  className="min-h-[120px] p-2 border-b border-r text-muted-foreground/30"
                  data-testid={`calendar-day-prev-${day}`}
                >
                  <div className="text-sm mb-1">{day}</div>
                  <div className="space-y-1">
                    {daySchedules.slice(0, 2).map((schedule) => (
                      <div
                        key={schedule.id}
                        className="text-xs p-1 rounded bg-muted/30 truncate cursor-pointer hover-elevate"
                        onClick={() => onScheduleClick?.(schedule)}
                      >
                        {schedule.title}
                      </div>
                    ))}
                    {daySchedules.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{daySchedules.length - 2}件
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Current Month Days */}
            {currentMonthDays.map((day, index) => {
              const daySchedules = getSchedulesForDate(day, 0);
              const today = isToday(day, 0);
              const dayOfWeek = (startingDayOfWeek + index) % 7;
              
              return (
                <div
                  key={`current-${day}`}
                  className={`min-h-[120px] p-2 border-b border-r ${
                    today ? "bg-primary/5" : ""
                  } ${daySchedules.length > 0 ? "cursor-pointer hover-elevate" : ""}`}
                  data-testid={`calendar-day-${day}`}
                  onClick={() => handleDateClick(day, 0)}
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
                      const categoryIds = getScheduleCategoryIds(schedule);
                      const primaryCategoryId = categoryIds[0];
                      const attendanceCount = getAttendanceCount(schedule.id);
                      
                      return (
                        <div
                          key={schedule.id}
                          className={`text-xs p-1.5 rounded border overflow-hidden ${primaryCategoryId ? getCategoryColor(primaryCategoryId) : 'bg-muted/10 text-muted-foreground border-muted/20'}`}
                          data-testid={`schedule-${schedule.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDateClick(day, 0);
                          }}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="font-medium truncate flex-1">{schedule.title}</div>
                            {attendanceCount > 0 && (
                              <div className="hidden md:flex items-center gap-0.5 shrink-0">
                                <span className="text-green-600 dark:text-green-400">○</span>
                                <span className="font-semibold">{attendanceCount}</span>
                              </div>
                            )}
                          </div>
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
              const daySchedules = getSchedulesForDate(day, 1);
              return (
                <div
                  key={`next-${index}`}
                  className="min-h-[120px] p-2 border-b border-r text-muted-foreground/30"
                  data-testid={`calendar-day-next-${day}`}
                >
                  <div className="text-sm mb-1">{day}</div>
                  <div className="space-y-1">
                    {daySchedules.slice(0, 2).map((schedule) => (
                      <div
                        key={schedule.id}
                        className="text-xs p-1 rounded bg-muted/30 truncate cursor-pointer hover-elevate"
                        onClick={() => onScheduleClick?.(schedule)}
                      >
                        {schedule.title}
                      </div>
                    ))}
                    {daySchedules.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{daySchedules.length - 2}件
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <Badge
            key={category.id}
            variant="outline"
            className={`rounded-full ${getCategoryColor(category.id)}`}
          >
            {category.name}
          </Badge>
        ))}
      </div>

      {/* Event Details Dialog */}
      <Dialog open={selectedDate !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-event-details">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日のイベント`}
            </DialogTitle>
            <DialogDescription>
              この日に予定されているイベントの詳細と参加者情報
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {selectedDaySchedules.map((schedule, index) => {
              const startTime = schedule.startHour !== null && schedule.startMinute !== null
                ? `${String(schedule.startHour).padStart(2, '0')}:${String(schedule.startMinute).padStart(2, '0')}`
                : "";
              const endTime = schedule.endHour !== null && schedule.endMinute !== null
                ? `${String(schedule.endHour).padStart(2, '0')}:${String(schedule.endMinute).padStart(2, '0')}`
                : "";
              const gatherTime = schedule.gatherHour !== null && schedule.gatherMinute !== null
                ? `${String(schedule.gatherHour).padStart(2, '0')}:${String(schedule.gatherMinute).padStart(2, '0')}`
                : "";

              const scheduleAttendances = getAttendancesBySchedule(schedule.id);
              const confirmedAttendances = scheduleAttendances.filter(a => a.status === "○");
              const maybeAttendances = scheduleAttendances.filter(a => a.status === "△");
              const absentAttendances = scheduleAttendances.filter(a => a.status === "×");

              return (
                <div key={schedule.id}>
                  {index > 0 && <Separator className="my-6" />}
                  
                  <Card className="border-0 shadow-md">
                    <CardContent className="p-6 space-y-4">
                      {/* Schedule Info */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <h3 className="text-xl font-bold">{schedule.title}</h3>
                            <div className="flex flex-wrap gap-2">
                              {getScheduleCategoryIds(schedule).map((categoryId) => (
                                <Badge key={categoryId} className={getCategoryColor(categoryId)}>
                                  {getCategoryName(categoryId)}
                                </Badge>
                              ))}
                              {schedule.studentCanRegister === false ? (
                                <Badge variant="secondary" className="rounded-full">
                                  コーチ指定
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="rounded-full">
                                  生徒登録可
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                closeDialog();
                                onScheduleClick?.(schedule);
                              }}
                              data-testid={`button-edit-schedule-${schedule.id}`}
                            >
                              編集
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                closeDialog();
                                onDeleteSchedule?.(schedule);
                              }}
                              data-testid={`button-delete-schedule-${schedule.id}`}
                            >
                              削除
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          {(startTime || endTime) && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-muted-foreground min-w-[80px]">時間:</span>
                              <span>
                                {startTime && endTime ? `${startTime} 〜 ${endTime}` : startTime || endTime}
                              </span>
                            </div>
                          )}
                          {gatherTime && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-muted-foreground min-w-[80px]">集合時間:</span>
                              <span>{gatherTime}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-muted-foreground min-w-[80px]">会場:</span>
                            <span>{schedule.venue || "未定"}</span>
                          </div>
                          {schedule.notes && (
                            <div className="flex items-start gap-2">
                              <span className="font-semibold text-muted-foreground min-w-[80px]">メモ:</span>
                              <span className="flex-1">{schedule.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Attendance Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <h4 className="font-semibold">参加者情報</h4>
                        </div>

                        <div className="space-y-4">
                          {/* 参加者 */}
                          {confirmedAttendances.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">
                                <span className="text-green-600 dark:text-green-400">○</span> 参加者 {confirmedAttendances.length}名
                              </h4>
                              {confirmedAttendances.map(attendance => (
                                <div key={attendance.id} className="flex items-center gap-2 text-sm">
                                  <span className="text-green-600 dark:text-green-400">○</span>
                                  <span>
                                    {getStudentName(attendance.studentId)}
                                    {attendance.comment && <span className="text-muted-foreground">（{attendance.comment}）</span>}
                                  </span>
                                  {selectedDaySchedules.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 ml-auto"
                                      onClick={() => openMoveParticipantDialog(attendance, schedule)}
                                      data-testid={`button-move-${attendance.id}`}
                                    >
                                      <ArrowRight className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 不参加 */}
                          {absentAttendances.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">
                                <span className="text-red-600 dark:text-red-400">×</span> 不参加 {absentAttendances.length}名
                              </h4>
                              {absentAttendances.map(attendance => (
                                <div key={attendance.id} className="flex items-center gap-2 text-sm">
                                  <span className="text-red-600 dark:text-red-400">×</span>
                                  <span>
                                    {getStudentName(attendance.studentId)}
                                    {attendance.comment && <span className="text-muted-foreground">（{attendance.comment}）</span>}
                                  </span>
                                  {selectedDaySchedules.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 ml-auto"
                                      onClick={() => openMoveParticipantDialog(attendance, schedule)}
                                      data-testid={`button-move-${attendance.id}`}
                                    >
                                      <ArrowRight className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 未定 */}
                          {maybeAttendances.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">
                                <span className="text-yellow-600 dark:text-yellow-400">△</span> 未定 {maybeAttendances.length}名
                              </h4>
                              {maybeAttendances.map(attendance => (
                                <div key={attendance.id} className="flex items-center gap-2 text-sm">
                                  <span className="text-yellow-600 dark:text-yellow-400">△</span>
                                  <span>
                                    {getStudentName(attendance.studentId)}
                                    {attendance.comment && <span className="text-muted-foreground">（{attendance.comment}）</span>}
                                  </span>
                                  {selectedDaySchedules.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 ml-auto"
                                      onClick={() => openMoveParticipantDialog(attendance, schedule)}
                                      data-testid={`button-move-${attendance.id}`}
                                    >
                                      <ArrowRight className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {scheduleAttendances.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              まだ参加者の回答がありません
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-close-dialog">
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Participant Dialog */}
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
                    {selectedDaySchedules
                      .filter(s => s.id !== moveParticipantData?.fromSchedule.id)
                      .map(schedule => (
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
            <Button onClick={handleParticipantMove} disabled={!targetScheduleId} data-testid="button-confirm-move">
              移動する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
