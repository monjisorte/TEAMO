import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Plus, Clock, Edit, Trash2, CalendarDays, List, Users, Paperclip, FileText, X as XIcon, Repeat } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarView } from "@/components/CalendarView";
import type { Schedule, Category, Student, Attendance, CoachCategory } from "@shared/schema";

// 時間（0-23）のオプションを生成
const generateHourOptions = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(),
    label: `${i}時`,
  }));
};

// 分（0,5,10...55）のオプションを生成
const generateMinuteOptions = () => {
  return Array.from({ length: 12 }, (_, i) => {
    const minute = i * 5;
    return {
      value: minute.toString(),
      label: `${minute}分`,
    };
  });
};

// 時間と分を結合して表示
const formatTime = (hour: number | null, minute: number | null) => {
  if (hour === null || minute === null) return "--:--";
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

interface ScheduleFormData {
  title: string;
  date: string;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  gatherHour: string;
  gatherMinute: string;
  categoryIds: string[];
  venue: string;
  notes: string;
  studentCanRegister: boolean;
  recurrenceRule: string;
  recurrenceInterval: string;
  recurrenceDays: string[];
  recurrenceEndDate: string;
}

export function ScheduleList() {
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "calendar" | "week">("list");
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    return weekStart;
  });
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<"all" | "my">("my");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; size: number }>>([]);
  const [showRecurringDeleteDialog, setShowRecurringDeleteDialog] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const [showRecurringEditDialog, setShowRecurringEditDialog] = useState(false);
  const [pendingScheduleData, setPendingScheduleData] = useState<Partial<Schedule> | null>(null);

  const [formData, setFormData] = useState<ScheduleFormData>({
    title: "",
    date: "",
    startHour: "10",
    startMinute: "0",
    endHour: "12",
    endMinute: "0",
    gatherHour: "9",
    gatherMinute: "45",
    categoryIds: [],
    venue: "",
    notes: "",
    studentCanRegister: true,
    recurrenceRule: "none",
    recurrenceInterval: "1",
    recurrenceDays: [],
    recurrenceEndDate: "",
  });

  // Get teamId and coachId from localStorage
  const coachData = localStorage.getItem("coachData");
  const teamId = coachData ? JSON.parse(coachData).teamId : null;
  const coachId = coachData ? JSON.parse(coachData).id : null;

  // データ取得
  const { data: schedules = [] } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories", teamId],
    enabled: !!teamId,
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: attendances = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendances"],
  });

  const { data: venues = [] } = useQuery<Array<{ id: string; name: string; address: string | null }>>({
    queryKey: ["/api/teams", teamId, "venues"],
    enabled: !!teamId,
  });

  const { data: coachCategories = [] } = useQuery<CoachCategory[]>({
    queryKey: ["/api/coach-categories", coachId],
    queryFn: async () => {
      const response = await fetch(`/api/coach-categories/${coachId}`);
      if (!response.ok) throw new Error("Failed to fetch coach categories");
      return response.json();
    },
    enabled: !!coachId,
  });

  // 初回ロード時またはカテゴリフィルター変更時に選択カテゴリを設定
  useEffect(() => {
    if (categories.length > 0) {
      if (categoryFilter === "my" && coachCategories.length > 0) {
        const myCoachCategoryIds = coachCategories.map(cc => cc.categoryId);
        setSelectedCategories(myCoachCategoryIds);
      } else if (categoryFilter === "all") {
        setSelectedCategories(categories.map(c => c.id));
      }
    }
  }, [categories, categoryFilter, coachCategories]);

  // スケジュール作成
  const createScheduleMutation = useMutation({
    mutationFn: async (data: Partial<Schedule>) => {
      const response = await apiRequest("POST", "/api/schedules", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "スケジュールを追加しました" });
      setShowAddDialog(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    },
  });

  // スケジュール更新
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Schedule> }) => {
      const response = await apiRequest("PUT", `/api/schedules/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "スケジュールを更新しました" });
      setShowEditDialog(false);
      setEditingSchedule(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    },
  });

  // スケジュール削除
  const deleteScheduleMutation = useMutation({
    mutationFn: async ({ id, deleteType }: { id: string; deleteType?: "this" | "all" }) => {
      const url = deleteType 
        ? `/api/schedules/${id}?deleteType=${deleteType}`
        : `/api/schedules/${id}`;
      await apiRequest("DELETE", url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "スケジュールを削除しました" });
    },
    onError: () => {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const newFiles = result.successful.map((file) => ({
        name: file.name,
        url: file.uploadURL || "",
        size: file.size || 0,
      }));
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      date: "",
      startHour: "10",
      startMinute: "0",
      endHour: "12",
      endMinute: "0",
      gatherHour: "9",
      gatherMinute: "45",
      categoryIds: [],
      venue: "",
      notes: "",
      studentCanRegister: true,
      recurrenceRule: "none",
      recurrenceInterval: "1",
      recurrenceDays: [],
      recurrenceEndDate: "",
    });
    setUploadedFiles([]);
  };

  const handleSaveSchedule = () => {
    if (!formData.title || !formData.date || formData.categoryIds.length === 0) {
      toast({ title: "必須項目を入力してください", variant: "destructive" });
      return;
    }

    const scheduleData: Partial<Schedule> = {
      title: formData.title,
      date: formData.date,
      startHour: parseInt(formData.startHour),
      startMinute: parseInt(formData.startMinute),
      endHour: parseInt(formData.endHour),
      endMinute: parseInt(formData.endMinute),
      gatherHour: parseInt(formData.gatherHour),
      gatherMinute: parseInt(formData.gatherMinute),
      categoryIds: formData.categoryIds,
      categoryId: formData.categoryIds[0] || null,
      venue: formData.venue || "未定",
      notes: formData.notes,
      studentCanRegister: formData.studentCanRegister,
      recurrenceRule: formData.recurrenceRule === "none" ? null : formData.recurrenceRule,
      recurrenceInterval: formData.recurrenceRule !== "none" ? parseInt(formData.recurrenceInterval) : null,
      recurrenceDays: formData.recurrenceRule === "weekly" && formData.recurrenceDays.length > 0 
        ? JSON.stringify(formData.recurrenceDays) 
        : null,
      recurrenceEndDate: formData.recurrenceRule !== "none" && formData.recurrenceEndDate 
        ? formData.recurrenceEndDate 
        : null,
      teamId: teamId, // Add teamId to schedule data
    };

    if (editingSchedule) {
      const isRecurringSchedule = editingSchedule.recurrenceRule && editingSchedule.recurrenceRule !== "none";
      if (isRecurringSchedule) {
        setPendingScheduleData(scheduleData);
        setShowRecurringEditDialog(true);
      } else {
        updateScheduleMutation.mutate({ id: editingSchedule.id, data: scheduleData });
      }
    } else {
      createScheduleMutation.mutate(scheduleData);
    }
  };

  const handleUpdateRecurringSchedule = (updateAll: boolean) => {
    if (!editingSchedule || !pendingScheduleData) return;
    
    // When updating all, exclude the date field to preserve individual dates
    const { date, ...dataWithoutDate } = pendingScheduleData;
    const dataToUpdate = updateAll ? dataWithoutDate : pendingScheduleData;
    
    const dataWithUpdateType = {
      ...dataToUpdate,
      updateType: updateAll ? "all" : "this"
    };
    
    updateScheduleMutation.mutate({ 
      id: editingSchedule.id, 
      data: dataWithUpdateType 
    });
    
    setShowRecurringEditDialog(false);
    setPendingScheduleData(null);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    const categoryIds = schedule.categoryIds || (schedule.categoryId ? [schedule.categoryId] : []);
    setFormData({
      title: schedule.title,
      date: schedule.date,
      startHour: (schedule.startHour ?? 10).toString(),
      startMinute: (schedule.startMinute ?? 0).toString(),
      endHour: (schedule.endHour ?? 12).toString(),
      endMinute: (schedule.endMinute ?? 0).toString(),
      gatherHour: (schedule.gatherHour ?? 9).toString(),
      gatherMinute: (schedule.gatherMinute ?? 45).toString(),
      categoryIds: categoryIds,
      venue: schedule.venue || "",
      notes: schedule.notes || "",
      studentCanRegister: schedule.studentCanRegister,
      recurrenceRule: schedule.recurrenceRule || "none",
      recurrenceInterval: (schedule.recurrenceInterval ?? 1).toString(),
      recurrenceDays: schedule.recurrenceDays ? JSON.parse(schedule.recurrenceDays) : [],
      recurrenceEndDate: schedule.recurrenceEndDate || "",
    });
    setShowEditDialog(true);
  };

  const handleDeleteSchedule = (schedule: Schedule) => {
    const isRecurringSchedule = schedule.recurrenceRule && schedule.recurrenceRule !== "none";
    if (isRecurringSchedule) {
      setScheduleToDelete(schedule);
      setShowRecurringDeleteDialog(true);
    } else {
      if (confirm("このスケジュールを削除しますか？")) {
        deleteScheduleMutation.mutate({ id: schedule.id });
      }
    }
  };

  const handleDeleteRecurringSchedule = (deleteAll: boolean) => {
    if (!scheduleToDelete) return;
    
    deleteScheduleMutation.mutate({
      id: scheduleToDelete.id,
      deleteType: deleteAll ? "all" : "this"
    });
    
    setShowRecurringDeleteDialog(false);
    setScheduleToDelete(null);
  };

  const handleParticipantMove = async (attendanceId: string, newScheduleId: string) => {
    try {
      const response = await apiRequest("PUT", `/api/attendances/${attendanceId}`, {
        scheduleId: newScheduleId,
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/attendances"] });
        toast({ title: "参加者を移動しました" });
      } else {
        toast({ title: "エラーが発生しました", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "エラーが発生しました", variant: "destructive" });
    }
  };

  // 出席状況を集計
  const getAttendanceCount = (scheduleId: string) => {
    const scheduleAttendances = attendances.filter(a => a.scheduleId === scheduleId);
    return {
      present: scheduleAttendances.filter(a => a.status === "present" || a.status === "○").length,
      maybe: scheduleAttendances.filter(a => a.status === "maybe" || a.status === "△").length,
      absent: scheduleAttendances.filter(a => a.status === "absent" || a.status === "×").length,
    };
  };

  // カテゴリフィルター切り替え
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  // フィルタリングされたスケジュール
  const filteredSchedules = schedules
    .filter(schedule => {
      // カテゴリが選択されていない場合は全て表示
      if (selectedCategories.length === 0) return true;
      
      const scheduleCategoryIds = schedule.categoryIds || (schedule.categoryId ? [schedule.categoryId] : []);
      return scheduleCategoryIds.some(catId => selectedCategories.includes(catId));
    })
    .sort((a, b) => {
      // 日付順（昇順）にソート
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      // 同じ日付の場合は開始時刻でソート
      const timeA = (a.startHour || 0) * 60 + (a.startMinute || 0);
      const timeB = (b.startHour || 0) * 60 + (b.startMinute || 0);
      return timeA - timeB;
    });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">スケジュール管理</h1>
          <p className="text-muted-foreground mt-2 text-lg">日々の活動を登録・管理</p>
        </div>
        <Button 
          className="h-12 px-6 rounded-xl text-base" 
          onClick={() => setShowAddDialog(true)}
          data-testid="button-add-schedule"
        >
          <Plus className="h-5 w-5 mr-2" />
          新規追加
        </Button>
      </div>

      {/* カテゴリフィルター */}
      {categories.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6 space-y-4">
            {/* Filter Toggle */}
            {coachCategories.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant={categoryFilter === "my" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("my")}
                  data-testid="button-my-categories"
                >
                  担当カテゴリのみ
                </Button>
                <Button
                  variant={categoryFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter("all")}
                  data-testid="button-all-categories"
                >
                  すべて
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-4">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                    data-testid={`checkbox-category-${category.id}`}
                  />
                  <Label htmlFor={`category-${category.id}`} className="cursor-pointer font-medium">
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar" | "week")} className="w-full">
        <TabsList>
          <TabsTrigger value="list" className="gap-2" data-testid="tab-list-view">
            <List className="h-4 w-4" />
            リスト
          </TabsTrigger>
          <TabsTrigger value="week" className="gap-2" data-testid="tab-week-view">
            <Calendar className="h-4 w-4" />
            週
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2" data-testid="tab-calendar-view">
            <CalendarDays className="h-4 w-4" />
            カレンダー
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-8">
          <div className="space-y-6">
            {filteredSchedules.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center text-muted-foreground">
                  スケジュールがありません
                </CardContent>
              </Card>
            ) : (
              filteredSchedules.map((schedule) => {
                const attendance = getAttendanceCount(schedule.id);
                const scheduleCategoryIds = schedule.categoryIds || (schedule.categoryId ? [schedule.categoryId] : []);
                const scheduleCategories = categories.filter(c => scheduleCategoryIds.includes(c.id));
                return (
                  <Card key={schedule.id} className="border-0 shadow-lg hover-elevate transition-all" data-testid={`schedule-card-${schedule.id}`}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        {/* 左側: 日付表示 */}
                        <div className="flex flex-col items-center justify-center min-w-[70px] h-20 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white shrink-0">
                          <div className="text-xs opacity-90">
                            {schedule.date.substring(5, 7)}月
                          </div>
                          <div className="text-2xl font-bold">
                            {schedule.date.split('-')[2]}
                          </div>
                        </div>

                        {/* 右側: 詳細情報 */}
                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h3 className="text-2xl font-bold mb-2">{schedule.title}</h3>
                              <div className="flex gap-2 flex-wrap">
                                {scheduleCategories.map(cat => (
                                  <Badge key={cat.id} variant="outline" className="rounded-full">{cat.name}</Badge>
                                ))}
                                <Badge 
                                  variant={schedule.studentCanRegister ? "default" : "secondary"} 
                                  className="rounded-full"
                                  data-testid={`badge-register-${schedule.id}`}
                                >
                                  {schedule.studentCanRegister ? "生徒登録可" : "コーチ指定"}
                                </Badge>
                                {schedule.recurrenceRule && schedule.recurrenceRule !== "none" && (
                                  <Badge variant="outline" className="rounded-full gap-1">
                                    <Repeat className="h-3 w-3" />
                                    {schedule.recurrenceRule === "daily" && "毎日"}
                                    {schedule.recurrenceRule === "weekly" && "毎週"}
                                    {schedule.recurrenceRule === "monthly" && "毎月"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                {formatTime(schedule.startHour, schedule.startMinute)}
                                {schedule.endHour !== null && schedule.endMinute !== null && 
                                  ` - ${formatTime(schedule.endHour, schedule.endMinute)}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {schedule.venue && schedule.venue !== "未定" && schedule.venue !== "その他" ? (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(schedule.venue)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="truncate hover:text-primary hover:underline"
                                  data-testid={`link-venue-${schedule.id}`}
                                >
                                  {schedule.venue}
                                </a>
                              ) : (
                                <span className="truncate">{schedule.venue || "未定"}</span>
                              )}
                            </div>
                          </div>

                          {(schedule.gatherHour !== null && schedule.gatherMinute !== null) && (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                              <span className="text-xs text-muted-foreground">集合:</span>
                              <span className="text-sm font-semibold">
                                {formatTime(schedule.gatherHour, schedule.gatherMinute)}
                              </span>
                            </div>
                          )}

                          {schedule.notes && (
                            <p className="text-sm text-muted-foreground p-3 rounded-xl bg-muted/30">{schedule.notes}</p>
                          )}
                          
                          {/* 出席人数と編集ボタンを横並び */}
                          <div className="flex items-center gap-3">
                            <div 
                              className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-600/10 cursor-pointer hover-elevate flex-1"
                              onClick={() => setSelectedSchedule(schedule.id)}
                              data-testid={`attendance-summary-${schedule.id}`}
                            >
                              <Users className="h-5 w-5 text-primary" />
                              <div className="flex gap-4 text-sm font-medium">
                                <span className="flex items-center gap-1">
                                  <span className="text-green-600 dark:text-green-400">○</span>
                                  <span data-testid={`count-present-${schedule.id}`}>{attendance.present}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="text-yellow-600 dark:text-yellow-400">△</span>
                                  <span data-testid={`count-maybe-${schedule.id}`}>{attendance.maybe}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="text-red-600 dark:text-red-400">×</span>
                                  <span data-testid={`count-absent-${schedule.id}`}>{attendance.absent}</span>
                                </span>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl" 
                              onClick={() => handleEditSchedule(schedule)}
                              data-testid={`button-edit-${schedule.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="week" className="mt-8">
          {(() => {
            const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
            const weekDaysData = Array.from({ length: 7 }, (_, i) => {
              const date = new Date(currentWeekStart);
              date.setDate(currentWeekStart.getDate() + i);
              return date;
            });

            const handlePrevWeek = () => {
              const newDate = new Date(currentWeekStart);
              newDate.setDate(currentWeekStart.getDate() - 7);
              setCurrentWeekStart(newDate);
            };

            const handleNextWeek = () => {
              const newDate = new Date(currentWeekStart);
              newDate.setDate(currentWeekStart.getDate() + 7);
              setCurrentWeekStart(newDate);
            };

            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(currentWeekStart.getDate() + 6);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={handlePrevWeek}
                      data-testid="button-prev-week"
                    >
                      前の週
                    </Button>
                    <h2 className="text-lg md:text-xl font-semibold">
                      {currentWeekStart.getMonth() + 1}月{currentWeekStart.getDate()}日 - {weekEnd.getMonth() + 1}月{weekEnd.getDate()}日
                    </h2>
                    <Button
                      variant="outline"
                      onClick={handleNextWeek}
                      data-testid="button-next-week"
                    >
                      次の週
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {weekDaysData.map((date, index) => {
                    const dateStr = date.toISOString().split("T")[0];
                    const daySchedules = filteredSchedules.filter(s => s.date === dateStr);
                    const isToday = new Date().toDateString() === date.toDateString();

                    return (
                      <Card key={index} className={`border-0 shadow-md ${isToday ? 'ring-2 ring-primary' : ''}`}>
                        <CardContent className="p-4 md:p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl ${isToday ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-muted'}`}>
                              <span className="text-xs md:text-sm">{weekDays[index]}</span>
                              <span className="text-lg md:text-2xl font-bold">{date.getDate()}</span>
                            </div>
                            <div>
                              <h3 className="text-base md:text-lg font-semibold">
                                {date.getMonth() + 1}月{date.getDate()}日（{weekDays[index]}）
                              </h3>
                              <p className="text-xs md:text-sm text-muted-foreground">
                                {daySchedules.length}件のスケジュール
                              </p>
                            </div>
                          </div>

                          {daySchedules.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              スケジュールがありません
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {daySchedules.map((schedule) => (
                                <div
                                  key={schedule.id}
                                  className="p-4 rounded-lg border bg-card hover-elevate cursor-pointer"
                                  onClick={() => setSelectedSchedule(schedule.id)}
                                  data-testid={`schedule-item-${schedule.id}`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-sm md:text-base mb-2">
                                        {schedule.title}
                                      </h4>
                                      <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-muted-foreground mb-2">
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 md:h-4 md:w-4" />
                                          {formatTime(schedule.startHour, schedule.startMinute)} - {formatTime(schedule.endHour, schedule.endMinute)}
                                        </span>
                                        {schedule.venue && (
                                          <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                                            {schedule.venue}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {(schedule.categoryIds || (schedule.categoryId ? [schedule.categoryId] : [])).map((catId) => {
                                          const category = categories.find(c => c.id === catId);
                                          return category ? (
                                            <Badge key={catId} variant="secondary" className="text-xs">
                                              {category.name}
                                            </Badge>
                                          ) : null;
                                        })}
                                        {schedule.parentScheduleId && (
                                          <Badge variant="outline" className="text-xs">
                                            <Repeat className="h-3 w-3 mr-1" />
                                            繰り返し
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditSchedule(schedule);
                                        }}
                                        data-testid={`button-edit-schedule-${schedule.id}`}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (schedule.parentScheduleId) {
                                            setScheduleToDelete(schedule);
                                            setShowRecurringDeleteDialog(true);
                                          } else {
                                            handleDeleteSchedule(schedule.id, "this");
                                          }
                                        }}
                                        data-testid={`button-delete-schedule-${schedule.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="calendar" className="mt-8">
          <CalendarView 
            schedules={filteredSchedules}
            categories={categories}
            attendances={attendances}
            students={students}
            onScheduleClick={(schedule) => {
              setEditingSchedule(schedule);
              const categoryIds = schedule.categoryIds || (schedule.categoryId ? [schedule.categoryId] : []);
              setFormData({
                title: schedule.title,
                date: schedule.date,
                startHour: schedule.startHour?.toString() || "10",
                startMinute: schedule.startMinute?.toString() || "0",
                endHour: schedule.endHour?.toString() || "12",
                endMinute: schedule.endMinute?.toString() || "0",
                gatherHour: schedule.gatherHour?.toString() || "9",
                gatherMinute: schedule.gatherMinute?.toString() || "45",
                categoryIds: categoryIds,
                venue: schedule.venue || "",
                notes: schedule.notes || "",
                studentCanRegister: schedule.studentCanRegister,
                recurrenceRule: schedule.recurrenceRule || "none",
                recurrenceInterval: schedule.recurrenceInterval?.toString() || "1",
                recurrenceDays: schedule.recurrenceDays ? JSON.parse(schedule.recurrenceDays) : [],
                recurrenceEndDate: schedule.recurrenceEndDate || "",
              });
              setShowEditDialog(true);
            }}
            onParticipantMove={handleParticipantMove}
            onDeleteSchedule={handleDeleteSchedule}
          />
        </TabsContent>
      </Tabs>

      {/* 参加者詳細ポップアップ */}
      <Dialog open={!!selectedSchedule} onOpenChange={(open) => !open && setSelectedSchedule(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">参加者詳細</DialogTitle>
          </DialogHeader>
          {selectedSchedule && (() => {
            const schedule = schedules.find(s => s.id === selectedSchedule);
            const participants = attendances
              .filter(a => a.scheduleId === selectedSchedule)
              .map(a => ({
                ...a,
                student: students.find(s => s.id === a.studentId)
              }))
              .filter(p => p.student);

            return (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-600/10">
                  <h3 className="font-semibold text-lg mb-2">{schedule?.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {schedule?.date && new Date(schedule.date).toLocaleDateString('ja-JP')} {formatTime(schedule?.startHour ?? null, schedule?.startMinute ?? null)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>参加者 {participants.length}名</span>
                  </div>

                  {participants.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      参加者がいません
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* 参加者 (○) */}
                      {(() => {
                        const present = participants.filter(p => p.status === 'present' || p.status === '○');
                        if (present.length === 0) return null;
                        return (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">参加者</h4>
                            {present.map((participant) => (
                              <div 
                                key={participant.student!.id} 
                                className="flex items-center gap-2 text-sm"
                                data-testid={`participant-present-${participant.student!.id}`}
                              >
                                <span className="text-green-600 dark:text-green-400">○</span>
                                <span>
                                  {participant.student!.name}
                                  {participant.comment && <span className="text-muted-foreground">（{participant.comment}）</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* 不参加 (×) */}
                      {(() => {
                        const absent = participants.filter(p => p.status === 'absent' || p.status === '×');
                        if (absent.length === 0) return null;
                        return (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">不参加</h4>
                            {absent.map((participant) => (
                              <div 
                                key={participant.student!.id} 
                                className="flex items-center gap-2 text-sm"
                                data-testid={`participant-absent-${participant.student!.id}`}
                              >
                                <span className="text-red-600 dark:text-red-400">×</span>
                                <span>
                                  {participant.student!.name}
                                  {participant.comment && <span className="text-muted-foreground">（{participant.comment}）</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* 未定 (△) */}
                      {(() => {
                        const maybe = participants.filter(p => p.status === 'maybe' || p.status === '△');
                        if (maybe.length === 0) return null;
                        return (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">未定</h4>
                            {maybe.map((participant) => (
                              <div 
                                key={participant.student!.id} 
                                className="flex items-center gap-2 text-sm"
                                data-testid={`participant-maybe-${participant.student!.id}`}
                              >
                                <span className="text-yellow-600 dark:text-yellow-400">△</span>
                                <span>
                                  {participant.student!.name}
                                  {participant.comment && <span className="text-muted-foreground">（{participant.comment}）</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => {
                      if (schedule) {
                        handleEditSchedule(schedule);
                        setSelectedSchedule(null);
                      }
                    }}
                    data-testid={`button-edit-from-popup-${selectedSchedule}`}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    編集
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      if (schedule) {
                        handleDeleteSchedule(schedule);
                        setSelectedSchedule(null);
                      }
                    }}
                    data-testid={`button-delete-from-popup-${selectedSchedule}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    削除
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* スケジュールフォームダイアログ */}
      <Dialog open={showAddDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setShowEditDialog(false);
          setEditingSchedule(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingSchedule ? "スケジュール編集" : "スケジュール新規追加"}
            </DialogTitle>
            <DialogDescription>
              活動の詳細情報を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="title">タイトル *</Label>
                <Input
                  id="title"
                  placeholder="例: 週末練習"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  data-testid="input-schedule-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">日付 *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  data-testid="input-schedule-date"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>カテゴリ *</Label>
                <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-muted/30">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`form-category-${category.id}`}
                        checked={formData.categoryIds.includes(category.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ 
                              ...formData, 
                              categoryIds: [...formData.categoryIds, category.id] 
                            });
                          } else {
                            setFormData({ 
                              ...formData, 
                              categoryIds: formData.categoryIds.filter(id => id !== category.id) 
                            });
                          }
                        }}
                        data-testid={`checkbox-form-category-${category.id}`}
                      />
                      <Label htmlFor={`form-category-${category.id}`} className="cursor-pointer font-medium">
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 開始時刻 */}
              <div className="space-y-2">
                <Label>開始時刻</Label>
                <div className="flex gap-2">
                  <Select value={formData.startHour} onValueChange={(value) => setFormData({ ...formData, startHour: value })}>
                    <SelectTrigger className="flex-1" data-testid="select-start-hour">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {generateHourOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={formData.startMinute} onValueChange={(value) => setFormData({ ...formData, startMinute: value })}>
                    <SelectTrigger className="flex-1" data-testid="select-start-minute">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {generateMinuteOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 終了時刻 */}
              <div className="space-y-2">
                <Label>終了時刻</Label>
                <div className="flex gap-2">
                  <Select value={formData.endHour} onValueChange={(value) => setFormData({ ...formData, endHour: value })}>
                    <SelectTrigger className="flex-1" data-testid="select-end-hour">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {generateHourOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={formData.endMinute} onValueChange={(value) => setFormData({ ...formData, endMinute: value })}>
                    <SelectTrigger className="flex-1" data-testid="select-end-minute">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {generateMinuteOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 集合時刻 */}
              <div className="space-y-2">
                <Label>集合時刻 *</Label>
                <div className="flex gap-2">
                  <Select value={formData.gatherHour} onValueChange={(value) => setFormData({ ...formData, gatherHour: value })}>
                    <SelectTrigger className="flex-1" data-testid="select-gather-hour">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {generateHourOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={formData.gatherMinute} onValueChange={(value) => setFormData({ ...formData, gatherMinute: value })}>
                    <SelectTrigger className="flex-1" data-testid="select-gather-minute">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {generateMinuteOptions().map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="venue">活動場所</Label>
                <Select value={formData.venue} onValueChange={(value) => setFormData({ ...formData, venue: value })}>
                  <SelectTrigger data-testid="select-schedule-venue">
                    <SelectValue placeholder="活動場所を選択（未選択の場合は「未定」）" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map(venue => (
                      <SelectItem key={venue.id} value={venue.name}>{venue.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 繰り返し設定 */}
              <div className="space-y-2 col-span-2">
                <Label htmlFor="recurrence">繰り返し設定</Label>
                <Select value={formData.recurrenceRule} onValueChange={(value) => setFormData({ ...formData, recurrenceRule: value })}>
                  <SelectTrigger data-testid="select-recurrence-rule">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">繰り返しなし</SelectItem>
                    <SelectItem value="daily">毎日</SelectItem>
                    <SelectItem value="weekly">毎週</SelectItem>
                    <SelectItem value="monthly">毎月</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrenceRule !== "none" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="recurrenceInterval">繰り返し間隔</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="recurrenceInterval"
                        type="number"
                        min="1"
                        value={formData.recurrenceInterval}
                        onChange={(e) => setFormData({ ...formData, recurrenceInterval: e.target.value })}
                        data-testid="input-recurrence-interval"
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">
                        {formData.recurrenceRule === "daily" && "日ごと"}
                        {formData.recurrenceRule === "weekly" && "週間ごと"}
                        {formData.recurrenceRule === "monthly" && "ヶ月ごと"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurrenceEndDate">繰り返し終了日</Label>
                    <Input
                      id="recurrenceEndDate"
                      type="date"
                      value={formData.recurrenceEndDate}
                      onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                      data-testid="input-recurrence-end-date"
                    />
                  </div>

                  {formData.recurrenceRule === "weekly" && (
                    <div className="space-y-2 col-span-2">
                      <Label>曜日を選択</Label>
                      <div className="flex gap-2 flex-wrap">
                        {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Checkbox
                              id={`day-${index}`}
                              checked={formData.recurrenceDays.includes(index.toString())}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({ 
                                    ...formData, 
                                    recurrenceDays: [...formData.recurrenceDays, index.toString()] 
                                  });
                                } else {
                                  setFormData({ 
                                    ...formData, 
                                    recurrenceDays: formData.recurrenceDays.filter(d => d !== index.toString()) 
                                  });
                                }
                              }}
                              data-testid={`checkbox-day-${index}`}
                            />
                            <Label htmlFor={`day-${index}`} className="cursor-pointer">
                              {day}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2 col-span-2">
                <Label htmlFor="notes">備考</Label>
                <Textarea
                  id="notes"
                  placeholder="持ち物や注意事項など"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="input-schedule-notes"
                />
              </div>

              <div className="flex items-center space-x-3 col-span-2 p-4 rounded-xl bg-muted/50">
                <Checkbox 
                  id="studentRegisterDisabled" 
                  checked={!formData.studentCanRegister}
                  onCheckedChange={(checked) => setFormData({ ...formData, studentCanRegister: !checked })}
                  data-testid="checkbox-student-register-disabled"
                />
                <Label 
                  htmlFor="studentRegisterDisabled" 
                  className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  生徒側から参加登録を不可能にする
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setShowEditDialog(false);
                setEditingSchedule(null);
                resetForm();
              }}
              data-testid="button-cancel"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
              data-testid="button-save-schedule"
            >
              {editingSchedule ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 繰り返しスケジュール削除確認ダイアログ */}
      <Dialog open={showRecurringDeleteDialog} onOpenChange={setShowRecurringDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>繰り返しスケジュールの削除</DialogTitle>
            <DialogDescription>
              このスケジュールは繰り返しスケジュールです。どのように削除しますか？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleDeleteRecurringSchedule(false)}
              data-testid="button-delete-single"
            >
              このイベントのみ削除
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleDeleteRecurringSchedule(true)}
              data-testid="button-delete-all"
            >
              すべての繰り返しイベントを削除
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowRecurringDeleteDialog(false);
                setScheduleToDelete(null);
              }}
              data-testid="button-cancel-delete"
            >
              キャンセル
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 繰り返しスケジュール編集確認ダイアログ */}
      <Dialog open={showRecurringEditDialog} onOpenChange={setShowRecurringEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>繰り返しスケジュールの編集</DialogTitle>
            <DialogDescription>
              このスケジュールは繰り返しスケジュールです。どのように更新しますか？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleUpdateRecurringSchedule(false)}
              data-testid="button-update-single"
            >
              このイベントのみ更新
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleUpdateRecurringSchedule(true)}
              data-testid="button-update-all"
            >
              すべての繰り返しイベントを更新
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowRecurringEditDialog(false);
                setPendingScheduleData(null);
              }}
              data-testid="button-cancel-update"
            >
              キャンセル
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
