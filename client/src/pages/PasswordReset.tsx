import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "パスワードは6文字以上である必要があります"),
  confirmPassword: z.string().min(6, "パスワードは6文字以上である必要があります"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function PasswordReset() {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState("");
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Determine if this is for coach or student based on URL path
  const isCoach = location.includes("/coach/");
  const apiPrefix = isCoach ? "/api/coach" : "/api/student";
  const returnPath = isCoach ? "/team" : "/";
  const userType = isCoach ? "コーチ" : "生徒";

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const verifyToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        toast({
          title: "エラー",
          description: "無効なリンクです",
          variant: "destructive",
        });
        setIsVerifying(false);
        return;
      }

      try {
        const response = await apiRequest("POST", `${apiPrefix}/verify-reset-token`, { token });
        const result = await response.json();

        if (response.ok && result.valid) {
          setTokenValid(true);
          setEmail(result.email);
        } else {
          toast({
            title: "エラー",
            description: "リンクが無効または期限切れです",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "エラー",
          description: "トークンの検証中にエラーが発生しました",
          variant: "destructive",
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [toast, apiPrefix]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      toast({
        title: "エラー",
        description: "無効なリンクです",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", `${apiPrefix}/reset-password`, {
        token,
        newPassword: data.newPassword,
      });
      const result = await response.json();

      if (response.ok) {
        toast({
          title: "成功",
          description: "パスワードがリセットされました。ログイン画面に移動します。",
        });
        setTimeout(() => {
          setLocation(returnPath);
        }, 2000);
      } else {
        toast({
          title: "エラー",
          description: result.error || "パスワードリセット中にエラーが発生しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "パスワードリセット中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">検証中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">エラー</CardTitle>
            <CardDescription className="text-center">
              リンクが無効または期限切れです
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation(returnPath)} 
              className="w-full"
              data-testid="button-back-to-login"
            >
              ログイン画面に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            TEAMO
          </CardTitle>
          <CardDescription className="text-center">
            {isCoach ? "コーチポータル" : "プレイヤーポータル"}
          </CardDescription>
          <CardTitle className="text-xl text-center pt-4">新しいパスワードを設定</CardTitle>
          <CardDescription className="text-center">
            {email} のパスワードを変更します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>新しいパスワード</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••" 
                        data-testid="input-new-password"
                        {...field} 
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
                    <FormLabel>パスワード確認</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••" 
                        data-testid="input-confirm-password"
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
                data-testid="button-reset-password"
              >
                {isLoading ? "リセット中..." : "パスワードをリセット"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
