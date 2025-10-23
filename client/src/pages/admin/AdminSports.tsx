import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Sport } from "@shared/schema";

export default function AdminSports() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [newSportName, setNewSportName] = useState("");
  const [newSportOrder, setNewSportOrder] = useState(0);
  const { toast } = useToast();

  const { data: sports = [], isLoading } = useQuery<Sport[]>({
    queryKey: ["/api/sports"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; order: number }) => {
      const response = await apiRequest("POST", "/api/sports", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sports"] });
      setIsAddDialogOpen(false);
      setNewSportName("");
      setNewSportOrder(0);
      toast({
        title: "追加完了",
        description: "スポーツを追加しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "スポーツの追加に失敗しました",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; order: number }) => {
      const response = await apiRequest("PUT", `/api/sports/${data.id}`, {
        name: data.name,
        order: data.order,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sports"] });
      setIsEditDialogOpen(false);
      setEditingSport(null);
      toast({
        title: "更新完了",
        description: "スポーツを更新しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "スポーツの更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/sports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sports"] });
      toast({
        title: "削除完了",
        description: "スポーツを削除しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "スポーツの削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    if (!newSportName.trim()) return;
    createMutation.mutate({
      name: newSportName,
      order: newSportOrder,
    });
  };

  const handleEdit = (sport: Sport) => {
    setEditingSport(sport);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingSport || !editingSport.name.trim()) return;
    updateMutation.mutate({
      id: editingSport.id,
      name: editingSport.name,
      order: editingSport.order,
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`「${name}」を削除してもよろしいですか？`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            スポーツ管理
          </h1>
          <p className="text-muted-foreground mt-2">
            スポーツの追加・編集・削除
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          data-testid="button-add-sport"
        >
          <Plus className="w-4 h-4 mr-2" />
          新規追加
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>スポーツ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {sports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              スポーツが登録されていません
            </p>
          ) : (
            <div className="space-y-2">
              {sports.map((sport) => (
                <div
                  key={sport.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`item-sport-${sport.id}`}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{sport.name}</p>
                      <p className="text-sm text-muted-foreground">
                        表示順: {sport.order}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(sport)}
                      data-testid={`button-edit-sport-${sport.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(sport.id, sport.name)}
                      data-testid={`button-delete-sport-${sport.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スポーツを追加</DialogTitle>
            <DialogDescription>
              新しいスポーツを追加します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-sport-name">スポーツ名</Label>
              <Input
                id="new-sport-name"
                value={newSportName}
                onChange={(e) => setNewSportName(e.target.value)}
                placeholder="例: サッカー"
                data-testid="input-new-sport-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-sport-order">表示順</Label>
              <Input
                id="new-sport-order"
                type="number"
                value={newSportOrder}
                onChange={(e) => setNewSportOrder(parseInt(e.target.value) || 0)}
                data-testid="input-new-sport-order"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={createMutation.isPending}
              data-testid="button-cancel-add"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleAdd}
              disabled={createMutation.isPending || !newSportName.trim()}
              data-testid="button-confirm-add"
            >
              {createMutation.isPending ? "追加中..." : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スポーツを編集</DialogTitle>
            <DialogDescription>
              スポーツ情報を編集します
            </DialogDescription>
          </DialogHeader>
          {editingSport && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sport-name">スポーツ名</Label>
                <Input
                  id="edit-sport-name"
                  value={editingSport.name}
                  onChange={(e) =>
                    setEditingSport({ ...editingSport, name: e.target.value })
                  }
                  data-testid="input-edit-sport-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sport-order">表示順</Label>
                <Input
                  id="edit-sport-order"
                  type="number"
                  value={editingSport.order}
                  onChange={(e) =>
                    setEditingSport({
                      ...editingSport,
                      order: parseInt(e.target.value) || 0,
                    })
                  }
                  data-testid="input-edit-sport-order"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateMutation.isPending}
              data-testid="button-cancel-edit"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending || !editingSport?.name.trim()}
              data-testid="button-confirm-edit"
            >
              {updateMutation.isPending ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
