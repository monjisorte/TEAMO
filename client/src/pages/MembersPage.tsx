import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Student, Category } from "@shared/schema";
import { Users } from "lucide-react";

export default function MembersPage() {
  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "未設定";
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "未設定";
  };

  const getPlayerTypeName = (playerType: string | null) => {
    if (playerType === "member") return "部活生";
    if (playerType === "school") return "スクール生";
    return "未設定";
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

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">メンバーが登録されていません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <Card key={student.id} className="hover-elevate" data-testid={`card-member-${student.id}`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={student.photoUrl || undefined} alt={student.name} />
                    <AvatarFallback>
                      {student.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" data-testid={`text-member-name-${student.id}`}>
                      {student.name}
                    </CardTitle>
                    <CardDescription className="truncate" data-testid={`text-member-email-${student.id}`}>
                      {student.email}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" data-testid={`badge-category-${student.id}`}>
                    {getCategoryName(student.categoryId)}
                  </Badge>
                  <Badge variant="outline" data-testid={`badge-player-type-${student.id}`}>
                    {getPlayerTypeName(student.playerType)}
                  </Badge>
                </div>
                {student.schoolName && (
                  <p className="text-sm text-muted-foreground" data-testid={`text-school-${student.id}`}>
                    {student.schoolName}
                  </p>
                )}
                {student.birthDate && (
                  <p className="text-sm text-muted-foreground" data-testid={`text-birthdate-${student.id}`}>
                    生年月日: {new Date(student.birthDate).toLocaleDateString('ja-JP')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
