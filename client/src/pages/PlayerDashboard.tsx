import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Calendar as CalendarIcon, CheckSquare, FileText } from "lucide-react";
import CategorySelection from "@/components/player/CategorySelection";
import AttendanceView from "@/components/player/AttendanceView";
import PlayerCalendar from "@/components/player/PlayerCalendar";
import SharedDocuments from "@/components/player/SharedDocuments";
import type { Category } from "@shared/schema";
import { getFullName } from "@/lib/nameUtils";

interface PlayerDashboardProps {
  player: { id: string; lastName: string; firstName: string; email: string; teamId: string };
  onLogout: () => void;
}

export default function PlayerDashboard({ player, onLogout }: PlayerDashboardProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [hasCategoriesSelected, setHasCategoriesSelected] = useState(false);

  // 生徒のカテゴリを取得
  const { data: studentCategories = [] } = useQuery<Category[]>({
    queryKey: [`/api/student/${player.id}/categories`],
  });

  // 既にカテゴリが設定されている場合は、自動的にダッシュボードを表示
  useEffect(() => {
    if (studentCategories.length > 0) {
      const categoryIds = studentCategories.map((cat) => cat.id);
      setSelectedCategories(categoryIds);
      setHasCategoriesSelected(true);
    }
  }, [studentCategories]);

  const handleCategoriesUpdated = (categoryIds: string[]) => {
    setSelectedCategories(categoryIds);
    setHasCategoriesSelected(categoryIds.length > 0);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-player-name">
              {getFullName(player.lastName, player.firstName)}さん
            </h1>
            <p className="text-sm text-muted-foreground">{player.email}</p>
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
                studentId={player.id}
                teamId={player.teamId}
                onCategoriesUpdated={handleCategoriesUpdated}
              />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="attendance">
            <TabsList className="grid w-full grid-cols-4 mb-6">
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
              <TabsTrigger value="settings" data-testid="tab-settings">
                カテゴリ設定
              </TabsTrigger>
            </TabsList>

            <TabsContent value="attendance">
              <AttendanceView 
                studentId={player.id} 
                selectedCategories={selectedCategories}
              />
            </TabsContent>

            <TabsContent value="calendar">
              <PlayerCalendar 
                studentId={player.id}
                teamId={player.teamId}
                selectedCategories={selectedCategories}
              />
            </TabsContent>

            <TabsContent value="documents">
              <SharedDocuments teamId={player.teamId} />
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>カテゴリ設定</CardTitle>
                </CardHeader>
                <CardContent>
                  <CategorySelection
                    studentId={player.id}
                    teamId={player.teamId}
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
