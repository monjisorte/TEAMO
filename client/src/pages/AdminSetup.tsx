import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

const setupSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上である必要があります"),
  confirmPassword: z.string().min(6, "パスワードは6文字以上である必要があります"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});

type SetupFormData = z.infer<typeof setupSchema>;

export default function AdminSetup() {
  // Set page title
  useEffect(() => {
    document.title = "管理者セットアップ | TEAMO管理者";
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState<boolean | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Check if setup is needed
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await apiRequest("GET", "/api/admin/setup-needed");
        const result = await response.json();
        setSetupNeeded(result.setupNeeded);
        
        if (!result.setupNeeded) {
          // If setup is not needed, redirect to login
          setTimeout(() => {
            setLocation("/admins/login");
          }, 2000);
        }
      } catch (error) {
        console.error("Error checking setup status:", error);
      }
    };

    checkSetup();
  }, [setLocation]);

  const onSubmit = async (data: SetupFormData) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/admin/register", {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      
      const result = await response.json();

      if (response.ok) {
        toast({
          title: "管理者登録完了",
          description: "管理者アカウントが作成されました。ログインページに移動します。",
        });

        setTimeout(() => {
          setLocation("/admins/login");
        }, 2000);
      } else {
        toast({
          title: "登録エラー",
          description: result.error || "管理者の登録に失敗しました",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "登録エラー",
        description: "管理者の登録中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (setupNeeded === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (setupNeeded === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">セットアップ完了</CardTitle>
            <CardDescription>
              管理者は既に登録されています。ログインページに移動します。
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            管理者セットアップ
          </CardTitle>
          <CardDescription>
            初回管理者アカウントを作成してください
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                        disabled={isLoading}
                        data-testid="input-admin-name"
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
                        disabled={isLoading}
                        data-testid="input-admin-email"
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
                        disabled={isLoading}
                        data-testid="input-admin-password"
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
                        disabled={isLoading}
                        data-testid="input-admin-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-admin-setup"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登録中...
                  </>
                ) : (
                  "管理者アカウントを作成"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
