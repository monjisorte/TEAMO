import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Mail, Key, Trash2, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { getFullName, getInitials } from "@/lib/nameUtils";

interface Coach {
  id: string;
  lastName: string;
  firstName: string;
  email: string;
  role: string;
  position?: string; // 役職名（代表、ヘッドコーチ、U-8担当など）
  createdAt: string;
  lastNameKana?: string;
  firstNameKana?: string;
  photoUrl?: string;
  bio?: string;
}

export function CoachManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [newCoach, setNewCoach] = useState({ lastName: "", firstName: "", email: "", password: "" });
  const [newPassword, setNewPassword] = useState("");

  // Get teamId and current coach role from localStorage
  const coachData = localStorage.getItem("coachData");
  const teamId = coachData ? JSON.parse(coachData).teamId : null;
  const currentCoachRole = coachData ? JSON.parse(coachData).role : null;

  // Fetch coaches
  const { data: coaches = [], isLoading } = useQuery<Coach[]>({
    queryKey: ["/api/teams", teamId, "coaches"],
    enabled: !!teamId,
  });

  // Add coach mutation
  const addCoachMutation = useMutation({
    mutationFn: async (data: { lastName: string; firstName: string; email: string; password: string }) => {
      return await apiRequest("POST", `/api/coach/register`, { ...data, teamId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "coaches"] });
      setNewCoach({ lastName: "", firstName: "", email: "", password: "" });
      setIsAddDialogOpen(false);
      toast({
        title: "成功",
        description: "コーチを追加しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "コーチの追加に失敗しました",
        variant: "destructive",
      });
    },
  });

  // Delete coach mutation
  const deleteCoachMutation = useMutation({
    mutationFn: async (coachId: string) => {
      return await apiRequest("DELETE", `/api/coaches/${coachId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "coaches"] });
      setIsDeleteDialogOpen(false);
      setSelectedCoach(null);
      toast({
        title: "成功",
        description: "コーチを削除しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "コーチの削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  // Set password mutation
  const setPasswordMutation = useMutation({
    mutationFn: async ({ coachId, password }: { coachId: string; password: string }) => {
      return await apiRequest("PATCH", `/api/coaches/${coachId}/password`, { password });
    },
    onSuccess: () => {
      setIsPasswordDialogOpen(false);
      setSelectedCoach(null);
      setNewPassword("");
      toast({
        title: "成功",
        description: "パスワードを設定しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "パスワードの設定に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleAddCoach = () => {
    if (newCoach.lastName && newCoach.firstName && newCoach.email && newCoach.password) {
      if (newCoach.password.length < 6) {
        toast({
          title: "エラー",
          description: "パスワードは6文字以上で入力してください",
          variant: "destructive",
        });
        return;
      }
      addCoachMutation.mutate(newCoach);
    } else {
      toast({
        title: "エラー",
        description: "すべての項目を入力してください",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (coach: Coach) => {
    setSelectedCoach(coach);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedCoach) {
      deleteCoachMutation.mutate(selectedCoach.id);
    }
  };

  const handlePasswordClick = (coach: Coach) => {
    setSelectedCoach(coach);
    setIsPasswordDialogOpen(true);
  };

  const handlePasswordSet = () => {
    if (selectedCoach && newPassword) {
      if (newPassword.length < 6) {
        toast({
          title: "エラー",
          description: "パスワードは6文字以上で入力してください",
          variant: "destructive",
        });
        return;
      }
      setPasswordMutation.mutate({ coachId: selectedCoach.id, password: newPassword });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 md:pb-24">
      <div className="flex items-center justify-end gap-4">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6 rounded-xl text-base" data-testid="button-add-coach">
              <Plus className="h-5 w-5 mr-2" />
              追加
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
                <Label htmlFor="coach-last-name">姓</Label>
                <Input
                  id="coach-last-name"
                  value={newCoach.lastName}
                  onChange={(e) => setNewCoach({ ...newCoach, lastName: e.target.value })}
                  placeholder="例: 山田"
                  data-testid="input-coach-last-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coach-first-name">名</Label>
                <Input
                  id="coach-first-name"
                  value={newCoach.firstName}
                  onChange={(e) => setNewCoach({ ...newCoach, firstName: e.target.value })}
                  placeholder="例: 太郎"
                  data-testid="input-coach-first-name"
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
                <Label htmlFor="coach-password">パスワード（6文字以上）</Label>
                <Input
                  id="coach-password"
                  type="password"
                  value={newCoach.password}
                  onChange={(e) => setNewCoach({ ...newCoach, password: e.target.value })}
                  placeholder="パスワードを入力"
                  data-testid="input-coach-password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel">
                キャンセル
              </Button>
              <Button 
                onClick={handleAddCoach} 
                disabled={addCoachMutation.isPending}
                data-testid="button-save-coach"
              >
                {addCoachMutation.isPending ? "追加中..." : "追加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {[...coaches].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((coach) => {
          const fullName = getFullName(coach.lastName, coach.firstName);
          
          const fullNameKana = coach.lastNameKana && coach.firstNameKana
            ? `${coach.lastNameKana} ${coach.firstNameKana}`
            : "";

          return (
            <Card key={coach.id} className="border-0 shadow-lg hover-elevate transition-all" data-testid={`coach-card-${coach.id}`}>
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20 border-2 border-primary/20">
                    <AvatarImage src={coach.photoUrl || ""} alt={fullName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-semibold text-xl">
                      {getInitials(coach.lastName, coach.firstName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-xl">{fullName}</CardTitle>
                      {coach.role === "owner" && (
                        <Badge variant="default" className="rounded-full" data-testid={`badge-owner-${coach.id}`}>
                          <Shield className="h-3 w-3 mr-1" />
                          代表
                        </Badge>
                      )}
                      {coach.position && (
                        <Badge variant="secondary" className="rounded-full" data-testid={`badge-position-${coach.id}`}>
                          {coach.position}
                        </Badge>
                      )}
                    </div>
                    {fullNameKana && (
                      <p className="text-sm text-muted-foreground">{fullNameKana}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{coach.email}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {coach.bio && (
                <CardContent className="pt-0 pb-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">プロフィール</h4>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{coach.bio}</p>
                  </div>
                </CardContent>
              )}

              {currentCoachRole === "owner" && (
                <CardContent className={`flex gap-3 ${coach.bio ? 'pt-0' : ''}`}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 rounded-xl" 
                    onClick={() => handlePasswordClick(coach)}
                    data-testid={`button-set-password-${coach.id}`}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    パスワード設定
                  </Button>
                  {coach.role !== "owner" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => handleDeleteClick(coach)}
                      data-testid={`button-delete-coach-${coach.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCoach && getFullName(selectedCoach.lastName, selectedCoach.firstName)}さんを削除すると、このコーチはチームにアクセスできなくなります。
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">キャンセル</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleteCoachMutation.isPending}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCoachMutation.isPending ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Setting Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>パスワード設定</DialogTitle>
            <DialogDescription>
              {selectedCoach && getFullName(selectedCoach.lastName, selectedCoach.firstName)}さんの新しいパスワードを設定します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">新しいパスワード（6文字以上）</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新しいパスワードを入力"
                data-testid="input-new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPasswordDialogOpen(false);
                setNewPassword("");
              }}
              data-testid="button-cancel-password"
            >
              キャンセル
            </Button>
            <Button 
              onClick={handlePasswordSet}
              disabled={setPasswordMutation.isPending}
              data-testid="button-confirm-password"
            >
              {setPasswordMutation.isPending ? "設定中..." : "設定する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
