import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Download, Upload } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Student, Category, StudentCategory } from "@shared/schema";
import { Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getFullName, getInitials } from "@/lib/nameUtils";

interface MembersPageProps {
  teamId: string;
}

export default function MembersPage({ teamId }: MembersPageProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ステータスラベルのヘルパー関数
  const getPlayerTypeLabel = (playerType: string | null | undefined) => {
    if (playerType === "team") return "チーム生";
    if (playerType === "school") return "スクール生";
    if (playerType === "inactive") return "休部";
    return "未設定";
  };

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: teamId ? [`/api/categories/${teamId}`] : [],
    enabled: !!teamId,
  });

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["/api/students", teamId],
    queryFn: async () => {
      const res = await fetch(`/api/students?teamId=${teamId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: !!teamId,
  });

  const { data: studentCategories = [] } = useQuery<StudentCategory[]>({
    queryKey: ["/api/student-categories"],
  });

  // Fetch sibling status for all students in the team
  const { data: siblingInfoMap = {} } = useQuery<Record<string, { hasSibling: boolean, siblings: Array<{ id: string, lastName: string, firstName: string }> }>>({
    queryKey: [`/api/sibling-links/team/${teamId}/status`],
    enabled: !!teamId,
  });

  const filteredStudents = useMemo(() => {
    if (selectedCategoryId === "all") {
      return students;
    }

    const studentsInCategory = studentCategories
      .filter(sc => sc.categoryId === selectedCategoryId)
      .map(sc => sc.studentId);

    return students.filter(student => studentsInCategory.includes(student.id));
  }, [students, studentCategories, selectedCategoryId]);

  // Get categories for a specific student
  const getStudentCategories = (studentId: string) => {
    return studentCategories
      .filter(sc => sc.studentId === studentId)
      .map(sc => sc.categoryId);
  };

  // カテゴリー追加のmutation
  const addCategoryMutation = useMutation({
    mutationFn: async ({ studentId, categoryId }: { studentId: string; categoryId: string }) => {
      await apiRequest("POST", "/api/student-categories", {
        studentId,
        categoryId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/student-categories"] });
      toast({
        title: "更新完了",
        description: "カテゴリーを追加しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "カテゴリーの追加に失敗しました",
        variant: "destructive",
      });
    },
  });

  // カテゴリー削除のmutation
  const removeCategoryMutation = useMutation({
    mutationFn: async ({ studentId, categoryId }: { studentId: string; categoryId: string }) => {
      await apiRequest("DELETE", `/api/student-categories/${studentId}/${categoryId}`, {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/student-categories"] });
      toast({
        title: "更新完了",
        description: "カテゴリーを削除しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "カテゴリーの削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  // カテゴリーのチェック状態を切り替え
  const handleCategoryToggle = (studentId: string, categoryId: string, isChecked: boolean) => {
    if (isChecked) {
      addCategoryMutation.mutate({ studentId, categoryId });
    } else {
      removeCategoryMutation.mutate({ studentId, categoryId });
    }
  };

  // ステータス変更のmutation
  const updatePlayerTypeMutation = useMutation({
    mutationFn: async ({ studentId, playerType }: { studentId: string; playerType: string }) => {
      return await apiRequest("PATCH", `/api/student/${studentId}`, { playerType });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "更新完了",
        description: "ステータスを更新しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "ステータスの更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  // Get sibling discount status based on actual sibling links
  const getSiblingDiscountStatus = (studentId: string) => {
    const siblingInfo = siblingInfoMap[studentId];
    if (siblingInfo && siblingInfo.hasSibling && siblingInfo.siblings.length > 0) {
      // Display first sibling name (if there are multiple siblings, show the first one)
      const sibling = siblingInfo.siblings[0];
      return `兄弟 ${getFullName(sibling.lastName, sibling.firstName)}`;
    }
    return " ";
  };

  const deleteMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return await apiRequest("DELETE", `/api/students/${studentId}`, {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      await queryClient.refetchQueries({ queryKey: ["/api/students"] });
      toast({
        title: "退会完了",
        description: "メンバーを退会させました",
      });
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
      setDeleteConfirmation("");
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "退会処理に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (student: Student) => {
    setSelectedStudent(student);
    setDeleteConfirmation("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmation === "delete" && selectedStudent) {
      deleteMutation.mutate(selectedStudent.id);
    }
  };

  // CSV Export
  const handleExport = async () => {
    try {
      const response = await fetch(`/api/students/export?teamId=${teamId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `members_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "エクスポート完了",
        description: "メンバー一覧をCSVファイルでダウンロードしました",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "エラー",
        description: "CSVエクスポートに失敗しました",
        variant: "destructive",
      });
    }
  };

  // CSV Import mutation
  const importMutation = useMutation({
    mutationFn: async (csvData: string) => {
      return await apiRequest("POST", "/api/students/import", { teamId, csvData });
    },
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "インポート完了",
        description: data.message || "インポートが完了しました",
      });
      setImportDialogOpen(false);
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "CSVインポートに失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleImport = async () => {
    if (!csvFile) {
      toast({
        title: "エラー",
        description: "CSVファイルを選択してください",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const text = await csvFile.text();
      importMutation.mutate(text);
    } catch (error) {
      toast({
        title: "エラー",
        description: "ファイルの読み込みに失敗しました",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 md:pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {categories.length > 0 && (
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="w-64" data-testid="select-category-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
            data-testid="button-import-csv"
          >
            <Upload className="w-4 h-4 mr-2" />
            インポート
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={students.length === 0}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            エクスポート
          </Button>
        </div>
      </div>

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">メンバーが登録されていません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredStudents.map((student) => {
            const fullName = getFullName(student.lastName, student.firstName);
            const fullNameKana = student.lastNameKana && student.firstNameKana
              ? `${student.lastNameKana} ${student.firstNameKana}`
              : "";
            
            return (
              <Card 
                key={student.id} 
                className="overflow-hidden hover-elevate" 
                data-testid={`card-member-${student.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20 border-2 border-primary/20">
                      <AvatarImage src={student.photoUrl || undefined} alt={fullName} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                        {getInitials(student.lastName, student.firstName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <CardTitle className="text-xl" data-testid={`text-member-name-${student.id}`}>
                          {fullName}
                        </CardTitle>
                        {fullNameKana && (
                          <CardDescription className="mt-1">{fullNameKana}</CardDescription>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">背番号</p>
                          <p className="text-sm" data-testid={`text-jersey-${student.id}`}>
                            {student.jerseyNumber != null && student.jerseyNumber >= 0 ? student.jerseyNumber : '未設定'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">生年月日</p>
                          <p className="text-sm" data-testid={`text-birthdate-${student.id}`}>
                            {student.birthDate 
                              ? new Date(student.birthDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
                              : '未設定'}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">学校名</p>
                          <p className="text-sm truncate" data-testid={`text-school-${student.id}`}>
                            {student.schoolName || '未設定'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">ステータス</p>
                          <Select
                            value={student.playerType || "none"}
                            onValueChange={(value) => {
                              const newValue = value === "none" ? "" : value;
                              updatePlayerTypeMutation.mutate({ studentId: student.id, playerType: newValue });
                            }}
                            data-testid={`select-player-type-${student.id}`}
                          >
                            <SelectTrigger className="w-full text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">未設定</SelectItem>
                              <SelectItem value="team">チーム生</SelectItem>
                              <SelectItem value="school">スクール生</SelectItem>
                              <SelectItem value="inactive">休部</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">カテゴリー</p>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full text-sm justify-between"
                                data-testid={`button-category-${student.id}`}
                              >
                                <span className="truncate">
                                  {(() => {
                                    const studentCategoryIds = getStudentCategories(student.id);
                                    if (studentCategoryIds.length === 0) return "未設定";
                                    const selectedCategories = categories.filter(c => studentCategoryIds.includes(c.id));
                                    if (selectedCategories.length === 1) return selectedCategories[0].name;
                                    return `${selectedCategories[0]?.name || ''}＋`;
                                  })()}
                                </span>
                                <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3" align="start">
                              <div className="space-y-2">
                                {(() => {
                                  // スクール生の場合、スクール専用カテゴリと既に割り当てられているカテゴリを表示
                                  const availableCategories = student.playerType === "school" 
                                    ? categories.filter(cat => {
                                        const isSchoolCategory = cat.isSchoolOnly;
                                        const isAlreadyAssigned = getStudentCategories(student.id).includes(cat.id);
                                        return isSchoolCategory || isAlreadyAssigned;
                                      })
                                    : categories;
                                  
                                  if (availableCategories.length === 0 && student.playerType === "school") {
                                    return (
                                      <p className="text-sm text-muted-foreground text-center py-2">
                                        スクール専用カテゴリーがありません
                                      </p>
                                    );
                                  }
                                  
                                  return availableCategories.map((category) => {
                                    const isChecked = getStudentCategories(student.id).includes(category.id);
                                    return (
                                      <div key={category.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`category-${student.id}-${category.id}`}
                                          checked={isChecked}
                                          onCheckedChange={(checked) => {
                                            handleCategoryToggle(student.id, category.id, checked as boolean);
                                          }}
                                          data-testid={`checkbox-category-${student.id}-${category.id}`}
                                        />
                                        <label
                                          htmlFor={`category-${student.id}-${category.id}`}
                                          className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                          {category.name}
                                        </label>
                                      </div>
                                    );
                                  });
                                })()}
                                {categories.length === 0 && (
                                  <p className="text-sm text-muted-foreground text-center py-2">
                                    カテゴリーがありません
                                  </p>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">兄弟</p>
                          <p className="text-sm flex items-center h-9" data-testid={`text-sibling-discount-${student.id}`}>
                            {getSiblingDiscountStatus(student.id)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(student)}
                      data-testid={`button-delete-${student.id}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に退会しますか？</AlertDialogTitle>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-semibold text-destructive">
                退会は取り消せません。退会するとすべてのデータが削除されます。
              </p>
              <p>
                {selectedStudent && getFullName(selectedStudent.lastName, selectedStudent.firstName)}さんを退会させます。
                以下のデータが完全に削除されます：
              </p>
              <ul className="list-disc list-inside mb-4">
                <li>プロフィール情報</li>
                <li>出席記録</li>
                <li>月謝支払い履歴</li>
                <li>兄弟アカウント連携</li>
              </ul>
              <p>実行するには、下の入力欄に <strong>delete</strong> と入力してください。</p>
            </div>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-confirm">確認入力</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="delete と入力"
              data-testid="input-delete-confirm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmation !== "delete" || deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover-elevate"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "退会処理中..." : "退会"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CSVインポート</DialogTitle>
            <DialogDescription>
              メンバー一覧をCSVファイルから一括登録・更新できます。
              <br />
              既存のメールアドレスがある場合は更新、ない場合は新規作成されます。
              <br />
              新規作成時のデフォルトパスワードは <code className="bg-muted px-1 rounded">password123</code> です。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>CSVファイル</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                data-testid="input-csv-file"
              />
              <p className="text-xs text-muted-foreground mt-2">
                フォーマット: 姓,名,姓（カナ）,名（カナ）,メールアドレス,学校名,生年月日,背番号,メンバータイプ,所属カテゴリ
                <br />
                所属カテゴリが複数ある場合はセミコロン（;）区切りで入力してください。
              </p>
            </div>
            
            {csvFile && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  選択ファイル: <span className="font-semibold">{csvFile.name}</span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setCsvFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              data-testid="button-cancel-import"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleImport}
              disabled={!csvFile || importMutation.isPending}
              data-testid="button-confirm-import"
            >
              {importMutation.isPending ? "インポート中..." : "インポート"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
