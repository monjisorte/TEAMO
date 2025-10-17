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
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">コーチ管理</h1>
          <p className="text-muted-foreground mt-2 text-lg">チームのコーチを登録・管理</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6 rounded-xl text-base" data-testid="button-add-coach">
              <Plus className="h-5 w-5 mr-2" />
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {coaches.map((coach) => (
          <Card key={coach.id} className="border-0 shadow-lg hover-elevate transition-all" data-testid={`coach-card-${coach.id}`}>
            <CardHeader className="space-y-0 pb-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-semibold text-xl">
                    {getInitials(coach.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl truncate">{coach.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{coach.email}</span>
                  </div>
                  {coach.phone && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{coach.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1 rounded-xl" data-testid={`button-edit-coach-${coach.id}`}>
                <Edit className="h-4 w-4 mr-2" />
                編集
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => handleDelete(coach.id)}
                data-testid={`button-delete-coach-${coach.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
