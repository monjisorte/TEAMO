import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, User, Loader2, Shield } from "lucide-react";

interface AdminAccount {
  id: string;
  name: string;
  email: string;
}

const adminSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上である必要があります"),
  confirmPassword: z.string().min(6, "パスワードは6文字以上である必要があります"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});

type AdminFormData = z.infer<typeof adminSchema>;

export default function AdminAccounts() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: admins, isLoading } = useQuery<AdminAccount[]>({
    queryKey: ["/api/admin/accounts"],
  });

  const form = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const addAdminMutation = useMutation({
    mutationFn: async (data: AdminFormData) => {
      const response = await apiRequest("POST", "/api/admin/accounts", {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "管理者の追加に失敗しました");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts"] });
      toast({
        title: "管理者追加完了",
        description: "新しい管理者アカウントが作成されました",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminFormData) => {
    addAdminMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent" data-testid="text-admin-accounts-title">
            管理者アカウント
          </h1>
          <p className="text-muted-foreground mt-1">
            システム管理者の一覧と追加
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-admin">
              <Plus className="mr-2 h-4 w-4" />
              管理者を追加
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>新しい管理者を追加</DialogTitle>
              <DialogDescription>
                新しい管理者アカウントの情報を入力してください
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>名前</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="管理者名"
                          disabled={addAdminMutation.isPending}
                          data-testid="input-new-admin-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>メールアドレス</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="admin@example.com"
                          disabled={addAdminMutation.isPending}
                          data-testid="input-new-admin-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>パスワード</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="6文字以上"
                          disabled={addAdminMutation.isPending}
                          data-testid="input-new-admin-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>パスワード（確認）</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="パスワードを再入力"
                          disabled={addAdminMutation.isPending}
                          data-testid="input-new-admin-confirm-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={addAdminMutation.isPending}
                    data-testid="button-cancel-add-admin"
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    disabled={addAdminMutation.isPending}
                    data-testid="button-submit-add-admin"
                  >
                    {addAdminMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        追加中...
                      </>
                    ) : (
                      "追加"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {admins && admins.length > 0 ? (
          admins.map((admin) => (
            <Card key={admin.id} data-testid={`card-admin-${admin.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-admin-name-${admin.id}`}>
                        {admin.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" />
                        <span data-testid={`text-admin-email-${admin.id}`}>
                          {admin.email}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                管理者アカウントがありません
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
