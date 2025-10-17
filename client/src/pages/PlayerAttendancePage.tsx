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
      <Card>
        <CardHeader>
          <CardTitle>カテゴリ選択</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            まず、閲覧したいカテゴリを選択してください。
          </p>
          <CategorySelection
            studentId={playerId}
            teamId={teamId}
            onCategoriesUpdated={handleCategoriesUpdated}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <AttendanceView 
      studentId={playerId} 
      selectedCategories={selectedCategories}
    />
  );
}
