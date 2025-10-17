import { useState, useEffect } from "react";
import CategorySelection from "@/components/player/CategorySelection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlayerSettingsPageProps {
  playerId: string;
}

export default function PlayerSettingsPage({ playerId }: PlayerSettingsPageProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    const savedCategories = localStorage.getItem(`player_${playerId}_categories`);
    if (savedCategories) {
      setSelectedCategories(JSON.parse(savedCategories));
    }
  }, [playerId]);

  const handleCategoriesUpdated = (categoryIds: string[]) => {
    setSelectedCategories(categoryIds);
    localStorage.setItem(`player_${playerId}_categories`, JSON.stringify(categoryIds));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>カテゴリ設定</CardTitle>
      </CardHeader>
      <CardContent>
        <CategorySelection
          studentId={playerId}
          onCategoriesUpdated={handleCategoriesUpdated}
        />
      </CardContent>
    </Card>
  );
}
