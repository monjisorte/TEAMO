import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student, Category, StudentCategory } from "@shared/schema";
import { Users } from "lucide-react";

interface PlayerMembersPageProps {
  teamId: string;
}

export default function PlayerMembersPage({ teamId }: PlayerMembersPageProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

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
    <div className="space-y-8 p-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          メンバー一覧
        </h1>
        <p className="text-muted-foreground text-lg">
          チームに所属するメンバーの一覧です
        </p>
      </div>

      {categories.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-semibold">カテゴリでフィルタ:</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="w-72 h-11 border-2" data-testid="select-category-filter">
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
          </CardContent>
        </Card>
      )}

      {students.length === 0 ? (
        <Card className="border-0 shadow-xl">
          <CardContent className="py-16 text-center">
            <div className="rounded-full bg-gradient-to-br from-blue-100 to-purple-100 p-6 w-24 h-24 mx-auto mb-6">
              <Users className="w-12 h-12 mx-auto text-blue-600" />
            </div>
            <p className="text-muted-foreground text-lg">メンバーが登録されていません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredStudents.map((student) => (
            <Card 
              key={student.id} 
              className="hover-elevate border-0 shadow-lg transition-all duration-300" 
              data-testid={`card-member-${student.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-16 w-16 ring-4 ring-blue-50">
                      <AvatarImage src={student.photoUrl || undefined} alt={student.name} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
                        {student.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-6 items-center">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-1">名前</p>
                      <p className="font-bold text-lg" data-testid={`text-member-name-${student.id}`}>
                        {student.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-1">生年月日</p>
                      <p className="text-sm font-medium" data-testid={`text-birthdate-${student.id}`}>
                        {student.birthDate 
                          ? new Date(student.birthDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                          : '未設定'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-1">学校名</p>
                      <p className="text-sm font-medium" data-testid={`text-school-${student.id}`}>
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
