import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Calendar as CalendarIcon, CheckSquare, FileText, Mail } from "lucide-react";
import CategorySelection from "@/components/student/CategorySelection";
import AttendanceView from "@/components/student/AttendanceView";
import StudentCalendar from "@/components/student/StudentCalendar";
import SharedDocuments from "@/components/student/SharedDocuments";
import ContactForm from "@/components/student/ContactForm";

interface StudentDashboardProps {
  student: { id: string; name: string; email: string; teamId: string };
  onLogout: () => void;
}

export default function StudentDashboard({ student, onLogout }: StudentDashboardProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [hasCategoriesSelected, setHasCategoriesSelected] = useState(false);

  const handleCategoriesUpdated = (categoryIds: string[]) => {
    setSelectedCategories(categoryIds);
    setHasCategoriesSelected(categoryIds.length > 0);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-student-name">
              {student.name}さん
            </h1>
            <p className="text-sm text-muted-foreground">{student.email}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={onLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {!hasCategoriesSelected ? (
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ選択</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                まず、閲覧したいカテゴリを選択してください。
              </p>
              <CategorySelection
                studentId={student.id}
                onCategoriesUpdated={handleCategoriesUpdated}
              />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="attendance">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="attendance" data-testid="tab-attendance">
                <CheckSquare className="w-4 h-4 mr-2" />
                出欠管理
              </TabsTrigger>
              <TabsTrigger value="calendar" data-testid="tab-calendar">
                <CalendarIcon className="w-4 h-4 mr-2" />
                カレンダー
              </TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents">
                <FileText className="w-4 h-4 mr-2" />
                共有資料
              </TabsTrigger>
              <TabsTrigger value="contact" data-testid="tab-contact">
                <Mail className="w-4 h-4 mr-2" />
                問い合わせ
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">
                カテゴリ設定
              </TabsTrigger>
            </TabsList>

            <TabsContent value="attendance">
              <AttendanceView 
                studentId={student.id} 
                selectedCategories={selectedCategories}
              />
            </TabsContent>

            <TabsContent value="calendar">
              <StudentCalendar 
                studentId={student.id}
                selectedCategories={selectedCategories}
              />
            </TabsContent>

            <TabsContent value="documents">
              <SharedDocuments teamId={student.teamId} />
            </TabsContent>

            <TabsContent value="contact">
              <ContactForm 
                teamId={student.teamId}
                studentName={student.name}
                studentEmail={student.email}
              />
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>カテゴリ設定</CardTitle>
                </CardHeader>
                <CardContent>
                  <CategorySelection
                    studentId={student.id}
                    onCategoriesUpdated={handleCategoriesUpdated}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
