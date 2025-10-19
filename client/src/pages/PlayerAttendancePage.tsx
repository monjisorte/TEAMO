import { useState, useEffect } from "react";
import AttendanceView from "@/components/player/AttendanceView";
import CategorySelection from "@/components/player/CategorySelection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlayerAttendancePageProps {
  playerId: string;
  teamId: string;
}

export default function PlayerAttendancePage({ playerId, teamId }: PlayerAttendancePageProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [hasCategoriesSelected, setHasCategoriesSelected] = useState(false);

  useEffect(() => {
    // Check if player has selected categories
    // This would typically come from the backend or local storage
    const savedCategories = localStorage.getItem(`player_${playerId}_categories`);
    if (savedCategories) {
      const categories = JSON.parse(savedCategories);
      setSelectedCategories(categories);
      setHasCategoriesSelected(categories.length > 0);
    }
  }, [playerId]);

  const handleCategoriesUpdated = (categoryIds: string[]) => {
    setSelectedCategories(categoryIds);
    setHasCategoriesSelected(categoryIds.length > 0);
    localStorage.setItem(`player_${playerId}_categories`, JSON.stringify(categoryIds));
  };

  if (!hasCategoriesSelected) {
    return (
      <div className="p-8 space-y-6">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            カテゴリ選択
          </h1>
          <p className="text-muted-foreground text-lg">
            閲覧したいカテゴリを選択してください
          </p>
        </div>
        <Card className="border-0 shadow-xl">
          <CardContent className="p-8">
            <CategorySelection
              studentId={playerId}
              teamId={teamId}
              onCategoriesUpdated={handleCategoriesUpdated}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <AttendanceView 
        studentId={playerId} 
        selectedCategories={selectedCategories}
      />
    </div>
  );
}
