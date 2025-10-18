import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Schedule, Category } from "@shared/schema";

interface CalendarViewProps {
  schedules: Schedule[];
  categories: Category[];
  onScheduleClick?: (schedule: Schedule) => void;
}

export function CalendarView({ schedules, categories, onScheduleClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "未分類";
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
    const dateStr = targetDate.toISOString().split('T')[0];
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
                  }`}
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
                      const startTime = schedule.startHour !== null && schedule.startMinute !== null
                        ? `${String(schedule.startHour).padStart(2, '0')}:${String(schedule.startMinute).padStart(2, '0')}`
                        : "";
                      
                      return (
                        <div
                          key={schedule.id}
                          className={`text-xs p-1.5 rounded border cursor-pointer hover-elevate ${getCategoryColor(schedule.categoryId)}`}
                          onClick={() => onScheduleClick?.(schedule)}
                          data-testid={`schedule-${schedule.id}`}
                        >
                          <div className="font-medium truncate">{schedule.title}</div>
                          {startTime && (
                            <div className="text-[10px] opacity-80">{startTime}</div>
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
    </div>
  );
}
