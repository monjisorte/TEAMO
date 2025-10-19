import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student, Category, StudentCategory, Team } from "@shared/schema";
import { Users } from "lucide-react";

export default function PlayerMembersPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const team = teams[0];
  const teamId = team?.id;

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
        <div className="space-y-3">
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
                  <div className="flex-1 grid grid-cols-3 gap-4 items-center">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
