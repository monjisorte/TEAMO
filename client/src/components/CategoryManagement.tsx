import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tag, Plus, Edit, Trash2, Users, ChevronUp, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Category, Team } from "@shared/schema";

export function CategoryManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", description: "", isSchoolOnly: false });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get teamId from localStorage
  const coachData = localStorage.getItem("coachData");
  const teamId = coachData ? JSON.parse(coachData).teamId : null;

  // Fetch categories for this team
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories", teamId],
    enabled: !!teamId,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { teamId: string; name: string; description?: string; isSchoolOnly: boolean }) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", teamId] });
      setNewCategory({ name: "", description: "", isSchoolOnly: false });
      setIsDialogOpen(false);
      toast({
        title: "成功",
        description: "カテゴリを追加しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "カテゴリの追加に失敗しました",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description?: string; isSchoolOnly: boolean } }) => {
      const response = await apiRequest("PUT", `/api/categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", teamId] });
      setEditingCategory(null);
      setIsEditMode(false);
      setIsDialogOpen(false);
      toast({
        title: "成功",
        description: "カテゴリを更新しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "カテゴリの更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  const reorderCategoryMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const response = await apiRequest("PATCH", `/api/categories/${id}/reorder`, { direction });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", teamId] });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "カテゴリの並び替えに失敗しました",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await apiRequest("DELETE", `/api/categories/${categoryId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", teamId] });
      toast({
        title: "成功",
        description: "カテゴリを削除しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "カテゴリの削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    if (!teamId) {
      toast({
        title: "エラー",
        description: "チームが見つかりません",
        variant: "destructive",
      });
      return;
    }

    if (newCategory.name) {
      createCategoryMutation.mutate({
        teamId: teamId,
        name: newCategory.name,
        description: newCategory.description || undefined,
        isSchoolOnly: newCategory.isSchoolOnly,
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      description: category.description || "",
      isSchoolOnly: category.isSchoolOnly || false,
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingCategory) return;

    if (newCategory.name) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        data: {
          name: newCategory.name,
          description: newCategory.description || undefined,
          isSchoolOnly: newCategory.isSchoolOnly,
        },
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setEditingCategory(null);
    setNewCategory({ name: "", description: "", isSchoolOnly: false });
  };

  const handleMoveUp = (id: string, index: number) => {
    if (index === 0) return;
    reorderCategoryMutation.mutate({ id, direction: 'up' });
  };

  const handleMoveDown = (id: string, index: number) => {
    if (index === categories.length - 1) return;
    reorderCategoryMutation.mutate({ id, direction: 'down' });
  };

  const handleDelete = (id: string) => {
    deleteCategoryMutation.mutate(id);
  };

  return (
    <div className="space-y-8 pb-16 md:pb-24">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">カテゴリー管理</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6 rounded-xl text-base" data-testid="button-add-category">
              <Plus className="h-5 w-5 mr-2" />
              追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? "カテゴリを編集" : "新しいカテゴリを追加"}</DialogTitle>
              <DialogDescription>
                学年やグループなど、チームを分類するカテゴリを登録してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">カテゴリ名</Label>
                <Input
                  id="category-name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="例: U-12"
                  data-testid="input-category-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-description">説明（任意）</Label>
                <Input
                  id="category-description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="例: 12歳以下"
                  data-testid="input-category-description"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="category-school-only"
                  checked={newCategory.isSchoolOnly}
                  onCheckedChange={(checked) => setNewCategory({ ...newCategory, isSchoolOnly: checked as boolean })}
                  data-testid="checkbox-school-only"
                />
                <Label htmlFor="category-school-only" className="cursor-pointer">
                  スクール生用
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog} data-testid="button-cancel">
                キャンセル
              </Button>
              <Button onClick={isEditMode ? handleSaveEdit : handleAdd} data-testid="button-save-category">
                {isEditMode ? "保存" : "追加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      ) : !teamId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            チームが見つかりません。先にチームを作成してください。
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            カテゴリがありません。「カテゴリを追加」ボタンから作成してください。
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1">
          {categories.map((category, index) => {
            return (
              <Card key={category.id} className="border-0 shadow-lg hover-elevate transition-all" data-testid={`category-card-${category.id}`}>
                <CardHeader className="space-y-0 pb-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="rounded-2xl bg-gradient-to-br from-primary to-purple-600 p-3">
                        <Tag className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-2 flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-base rounded-full px-4 py-1">{category.name}</Badge>
                          {category.isSchoolOnly && (
                            <Badge variant="secondary" className="text-xs rounded-full" data-testid={`badge-school-only-${category.id}`}>
                              スクール生用
                            </Badge>
                          )}
                        </CardTitle>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveUp(category.id, index)}
                      disabled={index === 0}
                      data-testid={`button-move-up-${category.id}`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveDown(category.id, index)}
                      disabled={index === categories.length - 1}
                      data-testid={`button-move-down-${category.id}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => handleEdit(category)}
                    data-testid={`button-edit-category-${category.id}`}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    編集
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => handleDelete(category.id)}
                    data-testid={`button-delete-category-${category.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    削除
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}

