import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2, Zap, Users, FileText } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@shared/schema";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function SubscribeForm({ teamId, onSuccess }: { teamId: string, onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + window.location.pathname,
        },
      });

      if (error) {
        toast({
          title: "決済エラー",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "アップグレード完了",
          description: "ベーシックプランへのアップグレードが完了しました",
        });
        onSuccess();
      }
    } catch (err) {
      toast({
        title: "エラー",
        description: "決済処理中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
        data-testid="button-confirm-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            処理中...
          </>
        ) : (
          "支払いを確定"
        )}
      </Button>
    </form>
  );
}

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [, setLocation] = useLocation();

  // Get teamId from coachData (for coaches) or directly from localStorage (for players)
  const coachData = localStorage.getItem("coachData");
  const teamId = coachData 
    ? JSON.parse(coachData).teamId 
    : localStorage.getItem("teamId");

  // Check for success/cancel parameters in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const sessionId = params.get('session_id');
    const canceled = params.get('canceled');
    
    if (success === 'true' && sessionId && teamId) {
      // Verify the payment with the server
      const verifyPayment = async () => {
        try {
          console.log("Verifying payment with session ID:", sessionId);
          const response = await apiRequest("POST", "/api/subscription/verify", {
            sessionId,
            teamId
          });
          
          const data = await response.json();
          console.log("Verification response:", data);
          
          if (data.success) {
            toast({
              title: "決済完了",
              description: "ベーシックプランへのアップグレードが完了しました。",
            });
            // Invalidate queries to refetch latest data
            queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
            queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
          } else {
            toast({
              title: "エラー",
              description: "決済の確認に失敗しました。サポートにお問い合わせください。",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error verifying payment:", error);
          toast({
            title: "エラー",
            description: "決済の確認に失敗しました。",
            variant: "destructive",
          });
        } finally {
          // Clear URL parameters
          setLocation('/coach/subscription', { replace: true });
        }
      };
      
      verifyPayment();
    } else if (canceled === 'true') {
      toast({
        title: "キャンセル",
        description: "決済がキャンセルされました。",
        variant: "destructive",
      });
      // Clear URL parameters
      setLocation('/coach/subscription', { replace: true });
    }
  }, [teamId, toast, setLocation]);

  const { data: team, isLoading } = useQuery<{
    id: string;
    name: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    stripeSubscriptionId: string | null;
    storageUsed: number;
  }>({
    queryKey: ["/api/teams", teamId],
    enabled: !!teamId,
  });

  // Fetch students to get member count
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    enabled: !!teamId,
  });

  const teamMembers = students.filter(s => s.teamId === teamId).length;

  const handleUpgrade = async () => {
    if (!teamId) {
      toast({
        title: "エラー",
        description: "チーム情報が見つかりません。再度ログインしてください。",
        variant: "destructive",
      });
      return;
    }

    setIsUpgrading(true);
    try {
      const response = await apiRequest("POST", "/api/subscription/create", { teamId });
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);
      console.log("Session URL:", data.sessionUrl);
      
      if (data.sessionUrl) {
        console.log("Opening Stripe Checkout in new window:", data.sessionUrl);
        // Open Stripe Checkout in a new window
        window.open(data.sessionUrl, '_blank');
        
        // Show message to user
        toast({
          title: "決済ページを開きました",
          description: "新しいタブでStripeの決済ページが開きます。決済完了後、このページに戻ってきてください。",
        });
        setIsUpgrading(false);
      } else {
        console.error("No sessionUrl in response");
        toast({
          title: "エラー",
          description: data.error || "サブスクリプションの作成に失敗しました",
          variant: "destructive",
        });
        setIsUpgrading(false);
      }
    } catch (error) {
      console.error("Subscription creation error:", error);
      toast({
        title: "エラー",
        description: "サブスクリプションの作成に失敗しました",
        variant: "destructive",
      });
      setIsUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!teamId || !window.confirm("本当にサブスクリプションをキャンセルしますか？")) return;

    try {
      await apiRequest("POST", "/api/subscription/cancel", { teamId });
      toast({
        title: "キャンセル完了",
        description: "サブスクリプションのキャンセルリクエストを受け付けました。現在の請求期間が終了するまでご利用いただけます。",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
    } catch (error) {
      toast({
        title: "エラー",
        description: "サブスクリプションのキャンセルに失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleSuccess = () => {
    setClientSecret(null);
    queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (clientSecret) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>ベーシックプランへアップグレード</CardTitle>
            <CardDescription>
              月額 2,000円でチーム管理の全機能をご利用いただけます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <SubscribeForm teamId={teamId!} onSuccess={handleSuccess} />
            </Elements>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isBasicPlan = team?.subscriptionPlan === "basic";
  const isActive = team?.subscriptionStatus === "active";

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">サブスクリプションプラン</h1>
        <p className="text-muted-foreground">
          チームに最適なプランをお選びください
        </p>
      </div>

      <Card 
        className="border-0 shadow-xl mb-6"
        data-testid="card-subscription-plan"
      >
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-3">
              {team?.subscriptionPlan === "basic" ? (
                <Crown className="h-5 w-5 text-white" />
              ) : (
                <Zap className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">
                {team?.subscriptionPlan === "basic" ? "ベーシックプラン" : "フリープラン"}
              </CardTitle>
              <CardDescription className="text-sm">
                {team?.subscriptionPlan === "basic" 
                  ? "すべての機能を利用可能" 
                  : "アップグレードして無制限に"}
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            {team?.subscriptionPlan === "basic" ? (
              <>
                <div className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  ¥2,000
                </div>
                <p className="text-xs text-muted-foreground">/月</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">
                  ¥0
                </div>
                <p className="text-xs text-muted-foreground">/月</p>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>
                {team?.subscriptionPlan === "basic" 
                  ? "無制限" 
                  : `${teamMembers}/100名`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>
                {team?.subscriptionPlan === "basic" 
                  ? "無制限" 
                  : `${Math.round((team?.storageUsed || 0) / (1024 * 1024))}MB/50MB`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {team && isBasicPlan && isActive && (
        <Card className="mb-6 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  現在のプラン: ベーシック
                </CardTitle>
                <CardDescription>
                  すべての機能をご利用いただけます
                </CardDescription>
              </div>
              <Badge variant="default" data-testid="badge-plan-status">アクティブ</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={handleCancelSubscription}
              data-testid="button-cancel-subscription"
            >
              サブスクリプションをキャンセル
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className={!isBasicPlan ? "border-2" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              フリープラン
              {!isBasicPlan && <Badge variant="secondary" data-testid="badge-current-free">現在のプラン</Badge>}
            </CardTitle>
            <CardDescription className="text-2xl font-bold">
              無料
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">チームメンバー100名まで</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">共有資料：50MBまで</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">1ヶ月前のイベントは自動削除</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">スケジュール管理</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">繰り返しイベント機能</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">出欠管理機能</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">会費管理機能</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={isBasicPlan && isActive ? "border-2 border-primary" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                ベーシックプラン
              </div>
              {isBasicPlan && isActive && <Badge variant="default" data-testid="badge-current-basic">現在のプラン</Badge>}
            </CardTitle>
            <CardDescription className="text-2xl font-bold">
              ¥2,000 <span className="text-sm font-normal text-muted-foreground">/月</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">フリープランのすべての機能</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold">無制限のチームメンバー</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold">無制限の共有資料容量</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold">すべてのイベント履歴を保存</span>
              </div>
            </div>

            {!isBasicPlan && (
              <Button 
                className="w-full" 
                onClick={handleUpgrade}
                disabled={isUpgrading}
                data-testid="button-upgrade-to-basic"
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    ベーシックプランにアップグレード
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>よくある質問</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-1">プランはいつでも変更できますか？</h3>
            <p className="text-sm text-muted-foreground">
              はい、いつでもプランの変更が可能です。ベーシックプランへのアップグレードは即座に反映され、フリープランへのダウングレードは現在の請求期間終了後に適用されます。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">支払い方法は何がありますか？</h3>
            <p className="text-sm text-muted-foreground">
              クレジットカード（Visa、Mastercard、American Express、JCB）でのお支払いが可能です。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">請求書は発行されますか？</h3>
            <p className="text-sm text-muted-foreground">
              はい、お支払い完了後に自動的に請求書が発行され、登録されたメールアドレスに送信されます。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
