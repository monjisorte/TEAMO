import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Schedule, Attendance } from "@shared/schema";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface AttendanceViewProps {
  studentId: string;
  selectedCategories: string[];
}

type AttendanceStatus = "○" | "△" | "×";

export default function AttendanceView({ studentId, selectedCategories }: AttendanceViewProps) {
  const { toast } = useToast();

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
    return (existing?.status as AttendanceStatus) || "×";
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

  const sortedSchedules = [...schedules].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          スケジュールがありません
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedSchedules.map((schedule) => {
        const currentStatus = getCurrentStatus(schedule.id);
        const currentComment = getCurrentComment(schedule.id);

        return (
          <Card key={schedule.id} data-testid={`card-schedule-${schedule.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{schedule.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <span data-testid={`text-schedule-date-${schedule.id}`}>
                      {format(new Date(schedule.date), "M月d日(E)", { locale: ja })}
                    </span>
                    {schedule.startTime && schedule.endTime && (
                      <span>
                        {schedule.startTime} - {schedule.endTime}
                      </span>
                    )}
                    {schedule.gatherTime && (
                      <Badge variant="outline">集合: {schedule.gatherTime}</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-sm">
                    <span className="text-muted-foreground">場所: </span>
                    <span>{schedule.venue}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">出欠状況</label>
                <div className="flex gap-2">
                  {(["○", "△", "×"] as AttendanceStatus[]).map((status) => (
                    <Button
                      key={status}
                      variant={currentStatus === status ? "default" : "outline"}
                      size="lg"
                      onClick={() => handleStatusChange(schedule.id, status)}
                      data-testid={`button-status-${status}-${schedule.id}`}
                      className="text-xl flex-1"
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">コメント</label>
                <Textarea
                  placeholder="コメントを入力..."
                  value={currentComment}
                  onChange={(e) => handleCommentChange(schedule.id, e.target.value)}
                  data-testid={`textarea-comment-${schedule.id}`}
                  rows={2}
                />
              </div>

              <Button
                onClick={() => handleSave(schedule.id)}
                disabled={savingScheduleId === schedule.id}
                data-testid={`button-save-${schedule.id}`}
                className="w-full"
              >
                {savingScheduleId === schedule.id ? "保存中..." : "保存"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
