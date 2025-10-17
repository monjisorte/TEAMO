import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, Plus, Edit, Trash2 } from "lucide-react";
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

// TODO: remove mock data
const MOCK_CATEGORIES = [
  { id: 1, name: "U-12", description: "12歳以下" },
  { id: 2, name: "U-15", description: "15歳以下" },
  { id: 3, name: "U-18", description: "18歳以下" },
  { id: 4, name: "全学年", description: "全員参加" },
];

export function CategoryManagement() {
  const [categories, setCategories] = useState(MOCK_CATEGORIES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });

  const handleAdd = () => {
    if (newCategory.name) {
      setCategories([...categories, { id: Date.now(), ...newCategory }]);
      setNewCategory({ name: "", description: "" });
      setIsDialogOpen(false);
      console.log('カテゴリを追加:', newCategory);
    }
  };

  const handleDelete = (id: number) => {
    setCategories(categories.filter(c => c.id !== id));
    console.log('カテゴリを削除:', id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">カテゴリ管理</h1>
          <p className="text-muted-foreground">学年やグループ分けを登録</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-category">
              <Plus className="h-4 w-4 mr-2" />
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <Card key={category.id} className="hover-elevate" data-testid={`category-card-${category.id}`}>
            <CardHeader className="space-y-0 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Tag className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">
                      <Badge variant="outline" className="text-base">{category.name}</Badge>
                    </CardTitle>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mt-2">{category.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-category-${category.id}`}>
                <Edit className="h-3 w-3 mr-1" />
                編集
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(category.id)}
                data-testid={`button-delete-category-${category.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
