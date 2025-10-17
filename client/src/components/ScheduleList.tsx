import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Plus, Clock, Edit, Trash2, CalendarDays, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// TODO: remove mock data
const MOCK_SCHEDULES = [
  {
    id: 1,
    title: "週末練習",
    date: "2024-10-20",
    startTime: "10:00",
    endTime: "12:00",
    gatherTime: "09:45",
    venue: "中央グラウンド",
    category: "U-12",
    notes: "ボールと水筒を持参してください",
  },
  {
    id: 2,
    title: "試合 vs 東チーム",
    date: "2024-10-22",
    startTime: "14:00",
    endTime: "16:00",
    gatherTime: "13:30",
    venue: "市民体育館",
    category: "U-15",
    notes: "ユニフォーム着用",
  },
  {
    id: 3,
    title: "技術練習",
    date: "2024-10-25",
    startTime: "16:00",
    endTime: "18:00",
    gatherTime: "15:45",
    venue: "中央グラウンド",
    category: "U-12",
    notes: "",
  },
  {
    id: 4,
    title: "合同練習",
    date: "2024-10-27",
    startTime: "10:00",
    endTime: "13:00",
    gatherTime: "09:30",
    venue: "県立スタジアム",
    category: "全学年",
    notes: "お弁当持参",
  },
];

export function ScheduleList() {
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">スケジュール管理</h1>
          <p className="text-muted-foreground">日々の活動を登録・管理</p>
        </div>
        <Button data-testid="button-add-schedule">
          <Plus className="h-4 w-4 mr-2" />
          新規追加
        </Button>
      </div>

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

        <TabsContent value="list" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MOCK_SCHEDULES.map((schedule) => (
              <Card key={schedule.id} className="hover-elevate" data-testid={`schedule-card-${schedule.id}`}>
                <CardHeader className="space-y-0 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{schedule.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(schedule.date).toLocaleDateString('ja-JP')}</span>
                      </div>
                    </div>
                    <Badge variant="outline">{schedule.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {schedule.startTime}
                        {schedule.endTime && ` - ${schedule.endTime}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{schedule.venue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">集合:</span>
                      <span className="text-xs font-medium">{schedule.gatherTime}</span>
                    </div>
                  </div>
                  {schedule.notes && (
                    <p className="text-xs text-muted-foreground border-t pt-3">{schedule.notes}</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-${schedule.id}`}>
                      <Edit className="h-3 w-3 mr-1" />
                      編集
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-delete-${schedule.id}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                <div className="text-center">
                  <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>カレンダービューは準備中です</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
