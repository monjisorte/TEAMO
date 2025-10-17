import { useState } from "react";
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

// TODO: remove mock data
const MOCK_STUDENTS = [
  { id: "1", name: "田中太郎", categoryId: "cat-1" },
  { id: "2", name: "佐藤花子", categoryId: "cat-1" },
  { id: "3", name: "鈴木一郎", categoryId: "cat-1" },
  { id: "4", name: "高橋美咲", categoryId: "cat-2" },
  { id: "5", name: "渡辺健太", categoryId: "cat-2" },
  { id: "6", name: "伊藤さくら", categoryId: "cat-2" },
  { id: "7", name: "山本大輔", categoryId: "cat-1" },
  { id: "8", name: "中村愛", categoryId: "cat-2" },
];

const MOCK_CATEGORIES = [
  { id: "cat-1", name: "U-12", description: "12歳以下" },
  { id: "cat-2", name: "U-15", description: "15歳以下" },
  { id: "cat-3", name: "U-18", description: "18歳以下" },
  { id: "cat-4", name: "全学年", description: "全員参加" },
];

export function CategoryManagement() {
  const [categories, setCategories] = useState(MOCK_CATEGORIES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const getStudentCount = (categoryId: string) => {
    return MOCK_STUDENTS.filter(s => s.categoryId === categoryId).length;
  };

  const getCategoryStudents = (categoryId: string) => {
    return MOCK_STUDENTS.filter(s => s.categoryId === categoryId);
  };

  const handleAdd = () => {
    if (newCategory.name) {
      setCategories([...categories, { id: `cat-${Date.now()}`, ...newCategory }]);
      setNewCategory({ name: "", description: "" });
      setIsDialogOpen(false);
      console.log('カテゴリを追加:', newCategory);
    }
  };

  const handleDelete = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
    console.log('カテゴリを削除:', id);
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => {
          const studentCount = getStudentCount(category.id);
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
                {/* 生徒数表示 */}
                <div 
                  className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-primary/10 to-purple-600/10 cursor-pointer hover-elevate"
                  onClick={() => setSelectedCategory(category.id)}
                  data-testid={`student-count-${category.id}`}
                >
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{studentCount}名</span>
                </div>
                
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="flex-1 rounded-xl" data-testid={`button-edit-category-${category.id}`}>
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
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 生徒一覧ポップアップ */}
      <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && setSelectedCategory(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">登録生徒一覧</DialogTitle>
            <DialogDescription>
              {selectedCategory && categories.find(c => c.id === selectedCategory)?.name} のメンバー
            </DialogDescription>
          </DialogHeader>
          {selectedCategory && (() => {
            const students = getCategoryStudents(selectedCategory);
            const category = categories.find(c => c.id === selectedCategory);
            
            return (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-600/10">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">合計 {students.length}名</span>
                  </div>
                </div>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {students.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">登録されている生徒がいません</p>
                  ) : (
                    students.map((student) => (
                      <div 
                        key={student.id} 
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover-elevate"
                        data-testid={`student-${student.id}`}
                      >
                        <span className="font-medium">{student.name}</span>
                        <Badge variant="outline" className="rounded-full">
                          {category?.name}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
