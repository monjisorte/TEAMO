import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ClubRegistration } from "@/components/ClubRegistration";
import { getFullName } from "@/lib/nameUtils";

const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上である必要があります"),
});

const resetRequestSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ResetRequestFormValues = z.infer<typeof resetRequestSchema>;

interface CoachLoginProps {
  onLoginSuccess: (coach: { id: string; lastName: string; firstName: string; email: string; teamId: string; role?: string }) => void;
}

export default function CoachLogin({ onLoginSuccess }: CoachLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  const { toast } = useToast();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const resetRequestForm = useForm<ResetRequestFormValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: {
      email: "",
    },
  });

  const onLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/coach/login", data);
      const result = await response.json();
      
      if (response.ok) {
        localStorage.setItem("coachData", JSON.stringify(result.coach));
        onLoginSuccess(result.coach);
        toast({
          title: "ログイン成功",
          description: `ようこそ、${getFullName(result.coach.lastName, result.coach.firstName)}さん`,
        });
      } else {
        toast({
          title: "ログイン失敗",
          description: result.error || "メールアドレスまたはパスワードが正しくありません",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "ログイン中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onResetRequest = async (data: ResetRequestFormValues) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/coach/request-password-reset", data);
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "メールを送信しました",
          description: "パスワードリセット用のリンクをメールで送信しました。メールをご確認ください。",
        });
        resetRequestForm.reset();
        setShowPasswordResetDialog(false);
      } else {
        toast({
          title: "エラー",
          description: result.error || "メール送信中にエラーが発生しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "メール送信中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900">
      <Card className="w-full max-w-md backdrop-blur-lg bg-white/90 dark:bg-black/90 border-white/20 shadow-2xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-4xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            TEAMO
          </CardTitle>
          <CardDescription className="text-center text-base">
            コーチポータル
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-coach-login">ログイン</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-coach-register">新規登録</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>メールアドレス</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="email@example.com" 
                            data-testid="input-coach-login-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>パスワード</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••" 
                            data-testid="input-coach-login-password"
                            {...field} 
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
                    data-testid="button-coach-login"
                  >
                    {isLoading ? "ログイン中..." : "ログイン"}
                  </Button>
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => setShowPasswordResetDialog(true)}
                      className="text-sm text-muted-foreground hover:text-primary underline"
                      data-testid="link-coach-forgot-password"
                    >
                      パスワードを忘れた場合
                    </button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="register">
              <div className="text-sm text-muted-foreground text-center mb-4">
                新規チーム登録は別ページで行います
              </div>
              <Button 
                className="w-full"
                onClick={() => window.location.href = '/register'}
                data-testid="button-go-register"
              >
                新規チーム登録へ
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showPasswordResetDialog} onOpenChange={setShowPasswordResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>パスワードをリセット</DialogTitle>
            <DialogDescription>
              登録されているメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
            </DialogDescription>
          </DialogHeader>
          <Form {...resetRequestForm}>
            <form onSubmit={resetRequestForm.handleSubmit(onResetRequest)} className="space-y-4">
              <FormField
                control={resetRequestForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>メールアドレス</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="email@example.com" 
                        data-testid="input-reset-email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordResetDialog(false)}
                  className="flex-1"
                  data-testid="button-cancel-reset"
                >
                  キャンセル
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isLoading}
                  data-testid="button-send-reset"
                >
                  {isLoading ? "送信中..." : "送信"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
