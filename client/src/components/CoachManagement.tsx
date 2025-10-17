import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Plus, Mail, Phone, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// TODO: remove mock data
const MOCK_COACHES = [
  { id: 1, name: "山田太郎", email: "yamada@example.com", phone: "090-1234-5678" },
  { id: 2, name: "佐藤花子", email: "sato@example.com", phone: "080-2345-6789" },
  { id: 3, name: "鈴木一郎", email: "suzuki@example.com", phone: "070-3456-7890" },
];

export function CoachManagement() {
  const [coaches, setCoaches] = useState(MOCK_COACHES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCoach, setNewCoach] = useState({ name: "", email: "", phone: "" });

  const handleAdd = () => {
    if (newCoach.name && newCoach.email) {
      setCoaches([...coaches, { id: Date.now(), ...newCoach }]);
      setNewCoach({ name: "", email: "", phone: "" });
      setIsDialogOpen(false);
      console.log('コーチを追加:', newCoach);
    }
  };

  const handleDelete = (id: number) => {
    setCoaches(coaches.filter(c => c.id !== id));
    console.log('コーチを削除:', id);
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">コーチ管理</h1>
          <p className="text-muted-foreground">チームのコーチを登録・管理</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-coach">
              <Plus className="h-4 w-4 mr-2" />
              コーチを追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しいコーチを追加</DialogTitle>
              <DialogDescription>
                チームに参加するコーチの情報を入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="coach-name">氏名</Label>
                <Input
                  id="coach-name"
                  value={newCoach.name}
                  onChange={(e) => setNewCoach({ ...newCoach, name: e.target.value })}
                  placeholder="例: 山田太郎"
                  data-testid="input-coach-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach-email">メールアドレス</Label>
                <Input
                  id="coach-email"
                  type="email"
                  value={newCoach.email}
                  onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value })}
                  placeholder="example@email.com"
                  data-testid="input-coach-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach-phone">電話番号（任意）</Label>
                <Input
                  id="coach-phone"
                  value={newCoach.phone}
                  onChange={(e) => setNewCoach({ ...newCoach, phone: e.target.value })}
                  placeholder="090-1234-5678"
                  data-testid="input-coach-phone"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                キャンセル
              </Button>
              <Button onClick={handleAdd} data-testid="button-save-coach">
                追加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {coaches.map((coach) => (
          <Card key={coach.id} className="hover-elevate" data-testid={`coach-card-${coach.id}`}>
            <CardHeader className="space-y-0 pb-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {getInitials(coach.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{coach.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{coach.email}</span>
                  </div>
                  {coach.phone && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{coach.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-coach-${coach.id}`}>
                <Edit className="h-3 w-3 mr-1" />
                編集
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(coach.id)}
                data-testid={`button-delete-coach-${coach.id}`}
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
