import { useState, useEffect } from "react";
import AttendanceView from "@/components/player/AttendanceView";
import CategorySelection from "@/components/player/CategorySelection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlayerAttendancePageProps {
  playerId: string;
  teamId: string;
}

export default function PlayerAttendancePage({ playerId, teamId }: PlayerAttendancePageProps) {
  // Initialize from localStorage immediately to avoid flickering
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const savedCategories = localStorage.getItem(`player_${playerId}_categories`);
    if (savedCategories) {
      try {
        return JSON.parse(savedCategories);
      } catch {
        return [];
      }
    }
    return [];
  });
  
  const [hasCategoriesSelected, setHasCategoriesSelected] = useState(() => {
    const savedCategories = localStorage.getItem(`player_${playerId}_categories`);
    if (savedCategories) {
      try {
        const categories = JSON.parse(savedCategories);
        return categories.length > 0;
      } catch {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    // Update state when playerId changes
    const savedCategories = localStorage.getItem(`player_${playerId}_categories`);
    if (savedCategories) {
      try {
        const categories = JSON.parse(savedCategories);
        setSelectedCategories(categories);
        setHasCategoriesSelected(categories.length > 0);
      } catch {
        setSelectedCategories([]);
        setHasCategoriesSelected(false);
      }
    } else {
      setSelectedCategories([]);
      setHasCategoriesSelected(false);
    }
  }, [playerId]);

  const handleCategoriesUpdated = (categoryIds: string[]) => {
    setSelectedCategories(categoryIds);
    setHasCategoriesSelected(categoryIds.length > 0);
    localStorage.setItem(`player_${playerId}_categories`, JSON.stringify(categoryIds));
  };

  if (!hasCategoriesSelected) {
    return (
      <div className="p-1 space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            カテゴリ選択
          </h1>
          <p className="text-muted-foreground text-sm">
            閲覧したいカテゴリを選択してください
          </p>
        </div>
        <Card className="border-0 shadow-xl">
          <CardContent className="p-3">
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
    <div className="p-1">
      <AttendanceView 
        studentId={playerId} 
        selectedCategories={selectedCategories}
      />
    </div>
  );
}
