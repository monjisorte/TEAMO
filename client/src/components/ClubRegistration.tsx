import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const SPORTS = [
  { value: "baseball", label: "野球", icon: "⚾" },
  { value: "soccer", label: "サッカー", icon: "⚽" },
  { value: "basketball", label: "バスケットボール", icon: "🏀" },
];

interface ClubRegistrationProps {
  onRegistrationSuccess?: (coach: { id: string; name: string; email: string; teamId: string }) => void;
}

export function ClubRegistration({ onRegistrationSuccess }: ClubRegistrationProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    clubName: "",
    address: "",
    sport: "",
    ownerName: "",
    ownerEmail: "",
    password: "",
  });
  const [teamCode, setTeamCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/teams/register", formData);
      const result = await response.json();

      if (response.ok) {
        setTeamCode(result.team.teamCode);
        setStep(4);
        
        // Auto-login after registration
        if (onRegistrationSuccess && result.coach) {
          localStorage.setItem("coachData", JSON.stringify(result.coach));
        }

        toast({
          title: "登録完了",
          description: "チームとコーチアカウントが作成されました",
        });
      } else {
        toast({
          title: "登録失敗",
          description: result.error || "登録中にエラーが発生しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "エラー",
        description: "登録中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleGoToDashboard = () => {
    if (onRegistrationSuccess) {
      const coachData = localStorage.getItem("coachData");
      if (coachData) {
        onRegistrationSuccess(JSON.parse(coachData));
      }
    } else {
      window.location.href = '/login';
    }
  };

  if (step === 4 && teamCode) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-purple-500/5 to-background p-4">
        <Card className="w-full max-w-3xl border-0 shadow-2xl">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="rounded-3xl bg-gradient-to-br from-primary to-purple-600 p-6">
                <CheckCircle2 className="h-16 w-16 text-white" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">クラブ登録完了</CardTitle>
            <CardDescription className="text-lg mt-2">チームコードが発行されました</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="bg-gradient-to-br from-primary/10 to-purple-600/10 p-8 rounded-2xl text-center">
              <p className="text-sm text-muted-foreground mb-3">チームコード</p>
              <p className="text-5xl font-mono font-bold tracking-wider bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent" data-testid="text-team-code">{teamCode}</p>
              <p className="text-xs text-muted-foreground mt-4">このコードを使って選手を招待できます</p>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-medium">登録情報:</p>
              <div className="grid gap-4 text-base">
                <div className="flex justify-between items-center p-4 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">クラブ名:</span>
                  <span className="font-semibold">{formData.clubName}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">オーナー:</span>
                  <span className="font-semibold">{formData.ownerName}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">メールアドレス:</span>
                  <span className="font-semibold">{formData.ownerEmail}</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground">スポーツ:</span>
                  <Badge variant="outline" className="rounded-full text-base px-4 py-1">{SPORTS.find(s => s.value === formData.sport)?.label}</Badge>
                </div>
              </div>
            </div>
            <Button className="w-full h-14 text-base rounded-xl" onClick={handleGoToDashboard} data-testid="button-go-dashboard">
              ダッシュボードへ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-purple-500/5 to-background p-4">
      <Card className="w-full max-w-3xl border-0 shadow-2xl">
        <CardHeader className="pb-8">
          <div className="flex items-center gap-3 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2.5 flex-1 rounded-full transition-all ${s <= step ? "bg-gradient-to-r from-primary to-purple-600" : "bg-muted"}`}
              />
            ))}
          </div>
          <CardTitle className="text-3xl">
            {step === 1 && "基本情報"}
            {step === 2 && "スポーツ選択"}
            {step === 3 && "オーナーアカウント"}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            ステップ {step} / 3
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clubName">クラブ名 *</Label>
                <Input
                  id="clubName"
                  value={formData.clubName}
                  onChange={(e) => updateField("clubName", e.target.value)}
                  placeholder="例: 山田スポーツクラブ"
                  data-testid="input-club-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">代表住所 *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="例: 東京都渋谷区..."
                  data-testid="input-address"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <Label className="text-base">スポーツを選択してください *</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SPORTS.map((sport) => (
                  <Card
                    key={sport.value}
                    className={`cursor-pointer hover-elevate active-elevate-2 border-0 shadow-lg transition-all ${
                      formData.sport === sport.value ? "ring-4 ring-primary shadow-xl scale-105" : ""
                    }`}
                    onClick={() => updateField("sport", sport.value)}
                    data-testid={`card-sport-${sport.value}`}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-8">
                      <div className="text-6xl mb-4">{sport.icon}</div>
                      <p className="font-semibold text-lg">{sport.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName">オーナー名 *</Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => updateField("ownerName", e.target.value)}
                  placeholder="例: 山田太郎"
                  data-testid="input-owner-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">オーナーメールアドレス *</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => updateField("ownerEmail", e.target.value)}
                  placeholder="example@email.com"
                  data-testid="input-owner-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="8文字以上"
                  data-testid="input-password"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between gap-4 pt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              className="h-12 px-6 rounded-xl text-base"
              data-testid="button-back"
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              戻る
            </Button>
            {step < 3 ? (
              <Button onClick={handleNext} className="h-12 px-6 rounded-xl text-base" data-testid="button-next">
                次へ
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="h-12 px-6 rounded-xl text-base" data-testid="button-submit">
                登録完了
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
