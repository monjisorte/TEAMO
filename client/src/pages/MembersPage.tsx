import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import type { Student, Category, StudentCategory } from "@shared/schema";
import { Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface MembersPageProps {
  teamId: string;
}

export default function MembersPage({ teamId }: MembersPageProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: teamId ? [`/api/categories/${teamId}`] : [],
    enabled: !!teamId,
  });

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: studentCategories = [] } = useQuery<StudentCategory[]>({
    queryKey: ["/api/student-categories"],
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          メンバー一覧
        </h1>
        <p className="text-muted-foreground mt-2">
          チームに所属するメンバーの一覧です
        </p>
      </div>

      {categories.length > 0 && (
        <div className="flex items-center gap-4">
          <Label>カテゴリでフィルタ:</Label>
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
        </div>
      )}

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">メンバーが登録されていません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4 px-4">
            <div className="h-14 w-14"></div>
            <div className="flex-1 grid grid-cols-4 gap-4">
              <div className="text-sm font-semibold text-muted-foreground">名前</div>
              <div className="text-sm font-semibold text-muted-foreground">生年月日</div>
              <div className="text-sm font-semibold text-muted-foreground">学校名</div>
              <div className="text-sm font-semibold text-muted-foreground">登録日</div>
            </div>
            <div className="w-20"></div>
          </div>
          {filteredStudents.map((student) => (
            <Card key={student.id} className="hover-elevate" data-testid={`card-member-${student.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={student.photoUrl || undefined} alt={student.name} />
                    <AvatarFallback>
                      {student.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                    <div>
                      <p className="font-medium" data-testid={`text-member-name-${student.id}`}>
                        {student.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-birthdate-${student.id}`}>
                        {student.birthDate 
                          ? new Date(student.birthDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                          : '未設定'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-school-${student.id}`}>
                        {student.schoolName || '未設定'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-created-${student.id}`}>
                        {student.createdAt 
                          ? new Date(student.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                          : '未設定'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(student)}
                    data-testid={`button-delete-${student.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    退会
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に退会しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStudent?.name}さんを退会させます。この操作は取り消せません。
              <br />
              <br />
              実行するには、下の入力欄に <strong>delete</strong> と入力してください。
            </AlertDialogDescription>
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
    </div>
  );
}
