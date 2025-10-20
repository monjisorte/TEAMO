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
    let filtered: Student[];
    
    if (selectedCategoryId === "all") {
      filtered = students;
    } else {
      const studentsInCategory = studentCategories
        .filter(sc => sc.categoryId === selectedCategoryId)
        .map(sc => sc.studentId);

      filtered = students.filter(student => studentsInCategory.includes(student.id));
    }

    // 生年月日順にソート（年上が上）
    return filtered.sort((a, b) => {
      if (!a.birthDate && !b.birthDate) return 0;
      if (!a.birthDate) return 1; // 未設定は下に
      if (!b.birthDate) return -1; // 未設定は下に
      return new Date(a.birthDate).getTime() - new Date(b.birthDate).getTime();
    });
  }, [students, studentCategories, selectedCategoryId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          メンバー一覧
        </h1>
      </div>

      {categories.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="h-9 border-2" data-testid="select-category-filter">
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
          <CardContent className="py-12 text-center">
            <div className="rounded-full bg-gradient-to-br from-blue-100 to-purple-100 p-4 w-16 h-16 mx-auto mb-4">
              <Users className="w-8 h-8 mx-auto text-blue-600" />
            </div>
            <p className="text-muted-foreground text-sm">メンバーが登録されていません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filteredStudents.map((student) => (
            <Card 
              key={student.id} 
              className="hover-elevate border-0 shadow-lg transition-all duration-300" 
              data-testid={`card-member-${student.id}`}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="relative" style={{ width: '20%' }}>
                    <Avatar className="w-full aspect-square ring-2 ring-blue-50">
                      <AvatarImage src={student.photoUrl || undefined} alt={student.name} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
                        {student.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="space-y-1.5" style={{ width: '80%' }}>
                    <div>
                      <p className="text-xs md:text-sm font-medium" data-testid={`text-member-name-${student.id}`}>
                        名前　<span className="font-bold text-sm md:text-base">{student.name}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-medium" data-testid={`text-jersey-${student.id}`}>
                        背番号　<span className="text-xs md:text-sm">{student.jerseyNumber != null && student.jerseyNumber >= 0 ? student.jerseyNumber : '未設定'}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-medium" data-testid={`text-birthdate-${student.id}`}>
                        生年月日　<span className="text-xs md:text-sm">{student.birthDate 
                          ? new Date(student.birthDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                          : '未設定'}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-medium" data-testid={`text-school-${student.id}`}>
                        学校名　<span className="text-xs md:text-sm">{student.schoolName || '未設定'}</span>
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
