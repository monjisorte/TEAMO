import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Category } from "@shared/schema";

interface CategorySelectionProps {
  studentId: string;
  teamId: string;
  onCategoriesUpdated?: (categoryIds: string[]) => void;
}

export default function CategorySelection({ studentId, teamId, onCategoriesUpdated }: CategorySelectionProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [originalCategories, setOriginalCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast} = useToast();

  const { data: allCategories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories", teamId],
    enabled: !!teamId,
  });

  const { data: studentCategories = [] } = useQuery<Category[]>({
    queryKey: [`/api/student/${studentId}/categories`],
  });

  useEffect(() => {
    const categoryIds = studentCategories.map((cat) => cat.id);
    setSelectedCategories(categoryIds);
    setOriginalCategories(categoryIds);
  }, [studentCategories]);

  const handleToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", `/api/student/${studentId}/categories`, { categoryIds: selectedCategories });

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: [`/api/student/${studentId}/categories`] });
        onCategoriesUpdated?.(selectedCategories);
        setOriginalCategories(selectedCategories);
        setIsEditing(false);
        toast({
          title: "保存成功",
          description: "カテゴリ設定を保存しました",
        });
      } else {
        toast({
          title: "エラー",
          description: "保存中にエラーが発生しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "保存中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setSelectedCategories(originalCategories);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {!isEditing && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            data-testid="button-edit-categories"
          >
            編集
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allCategories.map((category) => (
          <Card 
            key={category.id} 
            className={isEditing ? "cursor-pointer hover-elevate active-elevate-2" : ""}
            onClick={isEditing ? () => handleToggle(category.id) : undefined}
            data-testid={`card-category-${category.id}`}
          >
            <CardContent className="flex items-center space-x-3 p-4">
              <Checkbox
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={isEditing ? () => handleToggle(category.id) : undefined}
                disabled={!isEditing}
                data-testid={`checkbox-category-${category.id}`}
              />
              <div>
                <h3 className="font-semibold">{category.name}</h3>
                {category.description && (
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isEditing && (
        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={isLoading || selectedCategories.length === 0}
            data-testid="button-save-categories"
          >
            {isLoading ? "保存中..." : "カテゴリを保存"}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancelEdit}
            disabled={isLoading}
            data-testid="button-cancel-edit-categories"
          >
            キャンセル
          </Button>
        </div>
      )}
    </div>
  );
}
