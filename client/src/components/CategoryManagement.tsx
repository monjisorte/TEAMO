import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, Plus, Edit, Trash2, Users } from "lucide-react";
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
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
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
    mutationFn: async (data: { teamId: string; name: string; description?: string }) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories", teamId] });
      setNewCategory({ name: "", description: "" });
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
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteCategoryMutation.mutate(id);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">カテゴリ管理</h1>
          <p className="text-muted-foreground mt-2 text-lg">学年やグループ分けを登録</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6 rounded-xl text-base" data-testid="button-add-category">
              <Plus className="h-5 w-5 mr-2" />
              カテゴリを追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しいカテゴリを追加</DialogTitle>
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                キャンセル
              </Button>
              <Button onClick={handleAdd} data-testid="button-save-category">
                追加
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
          {categories.map((category) => {
            return (
              <Card key={category.id} className="border-0 shadow-lg hover-elevate transition-all" data-testid={`category-card-${category.id}`}>
                <CardHeader className="space-y-0 pb-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="rounded-2xl bg-gradient-to-br from-primary to-purple-600 p-3">
                        <Tag className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-2">
                          <Badge variant="outline" className="text-base rounded-full px-4 py-1">{category.name}</Badge>
                        </CardTitle>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3">
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

