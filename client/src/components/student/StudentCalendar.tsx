import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Schedule, Attendance } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ja } from "date-fns/locale";

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
    queryKey: [`/api/student/${studentId}/attendance`],
  });

  const getAttendanceForSchedule = (scheduleId: string) => {
    return attendances.find((att) => att.scheduleId === scheduleId);
  };

  const getSchedulesForDate = (date: Date) => {
    return schedules.filter((schedule) => 
      isSameDay(new Date(schedule.date), date)
    );
  };

  const handlePrevious = () => {
    setCurrentDate((prev) => 
      viewMode === "month" ? subMonths(prev, 1) : new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000)
    );
  };

  const handleNext = () => {
    setCurrentDate((prev) => 
      viewMode === "month" ? addMonths(prev, 1) : new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000)
    );
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const renderCalendar = () => {
    if (viewMode === "month") {
      return renderMonthView();
    } else {
      return renderWeekView();
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: ja });
    const endDate = endOfWeek(monthEnd, { locale: ja });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center font-semibold text-sm py-2">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const daySchedules = getSchedulesForDate(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={day.toISOString()}
              className={`min-h-24 cursor-pointer hover-elevate ${!isCurrentMonth ? "opacity-40" : ""}`}
              data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
            >
              <CardContent className="p-2">
                <div className={`text-sm font-semibold mb-1 ${isToday ? "text-primary" : ""}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {daySchedules.slice(0, 3).map((schedule) => {
                    const attendance = getAttendanceForSchedule(schedule.id);
                    return (
                      <div
                        key={schedule.id}
                        className="text-xs truncate p-1 rounded"
                        onClick={() => setSelectedSchedule(schedule)}
                        data-testid={`schedule-item-${schedule.id}`}
                      >
                        <span className="font-semibold mr-1">
                          {attendance?.status || "×"}
                        </span>
                        {schedule.title}
                      </div>
                    );
                  })}
                  {daySchedules.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{daySchedules.length - 3}件
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: ja });
    const weekEnd = endOfWeek(currentDate, { locale: ja });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="grid grid-cols-7 gap-4">
        {days.map((day) => {
          const daySchedules = getSchedulesForDate(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={day.toISOString()}
              className="min-h-48"
              data-testid={`calendar-week-day-${format(day, "yyyy-MM-dd")}`}
            >
              <CardHeader className="p-3">
                <CardTitle className={`text-sm ${isToday ? "text-primary" : ""}`}>
                  {format(day, "M/d(E)", { locale: ja })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {daySchedules.map((schedule) => {
                  const attendance = getAttendanceForSchedule(schedule.id);
                  return (
                    <Card
                      key={schedule.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedSchedule(schedule)}
                      data-testid={`schedule-item-${schedule.id}`}
                    >
                      <CardContent className="p-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={attendance?.status === "○" ? "default" : "secondary"}>
                            {attendance?.status || "×"}
                          </Badge>
                          <div>
                            <div className="text-sm font-semibold">{schedule.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {schedule.startTime}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                data-testid="button-calendar-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-bold" data-testid="text-calendar-month">
                {format(currentDate, "yyyy年M月", { locale: ja })}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                data-testid="button-calendar-next"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={handleToday}
                data-testid="button-calendar-today"
              >
                今日
              </Button>
            </div>
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
          </div>
        </CardHeader>
        <CardContent>{renderCalendar()}</CardContent>
      </Card>

      <Dialog open={!!selectedSchedule} onOpenChange={() => setSelectedSchedule(null)}>
        <DialogContent data-testid="dialog-schedule-details">
          {selectedSchedule && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSchedule.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-semibold">日時: </span>
                  <span className="text-sm">
                    {format(new Date(selectedSchedule.date), "M月d日(E)", { locale: ja })}
                    {selectedSchedule.startTime && selectedSchedule.endTime && (
                      <> {selectedSchedule.startTime} - {selectedSchedule.endTime}</>
                    )}
                  </span>
                </div>
                {selectedSchedule.gatherTime && (
                  <div>
                    <span className="text-sm font-semibold">集合時刻: </span>
                    <span className="text-sm">{selectedSchedule.gatherTime}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm font-semibold">場所: </span>
                  {selectedSchedule.venue !== "未定" && selectedSchedule.venue !== "その他" ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedSchedule.venue)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline"
                      data-testid="link-schedule-venue"
                    >
                      {selectedSchedule.venue}
                    </a>
                  ) : (
                    <span className="text-sm">{selectedSchedule.venue}</span>
                  )}
                </div>
                {selectedSchedule.notes && (
                  <div>
                    <span className="text-sm font-semibold block mb-1">備考: </span>
                    <p className="text-sm whitespace-pre-wrap">{selectedSchedule.notes}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-semibold">あなたの出欠: </span>
                  <Badge variant="default">
                    {getAttendanceForSchedule(selectedSchedule.id)?.status || "未登録"}
                  </Badge>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
