import { useState, useEffect } from "react";
import PlayerCalendar from "@/components/player/PlayerCalendar";
import CategorySelection from "@/components/player/CategorySelection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlayerCalendarPageProps {
  playerId: string;
  teamId: string;
}

export default function PlayerCalendarPage({ playerId, teamId }: PlayerCalendarPageProps) {
  // Set page title
  useEffect(() => {
    document.title = "TEAMO【ティーモ】クラブ運営サポートサイト";
  }, []);

  // Get player type from localStorage
  const [playerType, setPlayerType] = useState<string | undefined>(() => {
    const playerData = localStorage.getItem("playerData");
    if (playerData) {
      try {
        const data = JSON.parse(playerData);
        return data.playerType;
      } catch {
        return undefined;
      }
    }
    return undefined;
  });

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [hasCategoriesSelected, setHasCategoriesSelected] = useState(false);

  useEffect(() => {
    // Update player type when playerId or playerData changes
    const playerData = localStorage.getItem("playerData");
    if (playerData) {
      try {
        const data = JSON.parse(playerData);
        setPlayerType(data.playerType);
      } catch {
        setPlayerType(undefined);
      }
    }

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
              playerType={playerType}
              onCategoriesUpdated={handleCategoriesUpdated}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-1">
      <PlayerCalendar 
        studentId={playerId}
        teamId={teamId}
        selectedCategories={selectedCategories}
      />
    </div>
  );
}
