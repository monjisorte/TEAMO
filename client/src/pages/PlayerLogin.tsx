import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上である必要があります"),
});

const registerSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上である必要があります"),
  teamCode: z.string().length(8, "チームIDは8文字です"),
});

const resetRequestSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ResetRequestFormValues = z.infer<typeof resetRequestSchema>;

interface PlayerLoginProps {
  onLoginSuccess: (player: { id: string; name: string; email: string; teamId: string }) => void;
}

export default function PlayerLogin({ onLoginSuccess }: PlayerLoginProps) {
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

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      teamCode: "",
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
      const response = await apiRequest("POST", "/api/student/login", data);
      const result = await response.json();
      
      if (response.ok) {
        localStorage.setItem("playerData", JSON.stringify(result.student));
        onLoginSuccess(result.student);
        toast({
          title: "ログイン成功",
          description: `ようこそ、${result.student.name}さん`,
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

  const onRegister = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/student/register", data);
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "登録成功",
          description: "アカウントが作成されました。ログインしてください。",
        });
        registerForm.reset();
      } else {
        toast({
          title: "登録失敗",
          description: result.error || "登録中にエラーが発生しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "登録中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onResetRequest = async (data: ResetRequestFormValues) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/student/request-password-reset", data);
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
            選手ポータル
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">ログイン</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">新規登録</TabsTrigger>
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
                            data-testid="input-login-email"
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
                            data-testid="input-login-password"
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
                    data-testid="button-login"
                  >
                    {isLoading ? "ログイン中..." : "ログイン"}
                  </Button>
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => setShowPasswordResetDialog(true)}
                      className="text-sm text-muted-foreground hover:text-primary underline"
                      data-testid="link-forgot-password"
                    >
                      パスワードを忘れた場合
                    </button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>名前</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="山田太郎" 
                            data-testid="input-register-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>メールアドレス</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="email@example.com" 
                            data-testid="input-register-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>パスワード</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••" 
                            data-testid="input-register-password"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="teamCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>チームID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="チームから共有されたチームID" 
                            maxLength={8}
                            data-testid="input-register-teamcode"
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
                    data-testid="button-register"
                  >
                    {isLoading ? "登録中..." : "アカウント作成"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              コーチの方は
              <Link href="/team">
                <span className="ml-1 text-primary hover:underline font-medium cursor-pointer" data-testid="link-coach-login">
                  こちらからログイン
                </span>
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPasswordResetDialog} onOpenChange={setShowPasswordResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>パスワードのリセット</DialogTitle>
            <DialogDescription>
              登録したメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
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
                  data-testid="button-send-reset-email"
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
