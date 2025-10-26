import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2 } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

  const teamId = localStorage.getItem("teamId");

  const { data: team, isLoading } = useQuery<{
    id: string;
    name: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    stripeSubscriptionId: string | null;
  }>({
    queryKey: ["/api/teams", teamId],
    enabled: !!teamId,
  });

  const handleUpgrade = async () => {
    if (!teamId) return;

    setIsUpgrading(true);
    try {
      const response = await apiRequest("POST", "/api/subscription/create", { teamId });
      const data = await response.json();
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        toast({
          title: "エラー",
          description: "サブスクリプションの作成に失敗しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "サブスクリプションの作成に失敗しました",
        variant: "destructive",
      });
    } finally {
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
