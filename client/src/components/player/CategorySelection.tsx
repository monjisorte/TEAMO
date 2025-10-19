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
    queryKey: teamId ? [`/api/categories/${teamId}`] : [],
    enabled: !!teamId,
  });

  const { data: studentCategories = [] } = useQuery<Category[]>({
    queryKey: [`/api/student/${studentId}/categories`],
  });

  useEffect(() => {
    const categoryIds = studentCategories.map((cat) => cat.id);
    const categoryIdsStr = JSON.stringify([...categoryIds].sort());
    
    setSelectedCategories(prev => {
      const prevStr = JSON.stringify([...prev].sort());
      return prevStr === categoryIdsStr ? prev : categoryIds;
    });
    setOriginalCategories(prev => {
      const prevStr = JSON.stringify([...prev].sort());
      return prevStr === categoryIdsStr ? prev : categoryIds;
    });
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
    <div className="space-y-6">
      {!isEditing && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            data-testid="button-edit-categories"
            className="font-semibold"
          >
            編集
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allCategories.map((category) => (
          <Card 
            key={category.id} 
            className={`
              border-2 transition-all duration-300
              ${selectedCategories.includes(category.id) 
                ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg' 
                : 'border-gray-200 hover-elevate'
              }
              ${isEditing ? "cursor-pointer active-elevate-2" : ""}
            `}
            onClick={isEditing ? () => handleToggle(category.id) : undefined}
            data-testid={`card-category-${category.id}`}
          >
            <CardContent className="flex items-center space-x-4 p-5">
              <Checkbox
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={isEditing ? () => handleToggle(category.id) : undefined}
                disabled={!isEditing}
                data-testid={`checkbox-category-${category.id}`}
                className="h-5 w-5"
              />
              <div className="flex-1">
                <h3 className={`font-bold text-base ${selectedCategories.includes(category.id) ? 'text-blue-700' : ''}`}>
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isEditing && (
        <div className="flex gap-3 pt-2">
          <Button 
            onClick={handleSave} 
            disabled={isLoading || selectedCategories.length === 0}
            data-testid="button-save-categories"
            className="flex-1 font-semibold"
          >
            {isLoading ? "保存中..." : "カテゴリを保存"}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancelEdit}
            disabled={isLoading}
            data-testid="button-cancel-edit-categories"
            className="flex-1 font-semibold"
          >
            キャンセル
          </Button>
        </div>
      )}
    </div>
  );
}
