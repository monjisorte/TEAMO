import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SPORTS = [
  { value: "baseball", label: "野球", icon: "⚾" },
  { value: "soccer", label: "サッカー", icon: "⚽" },
  { value: "basketball", label: "バスケットボール", icon: "🏀" },
];

export function ClubRegistration() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    clubName: "",
    address: "",
    sport: "",
    ownerName: "",
    ownerEmail: "",
    password: "",
  });
  const [teamId, setTeamId] = useState("");

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const generatedId = `TEAM-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    setTeamId(generatedId);
    setStep(4);
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  if (step === 4 && teamId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">クラブ登録完了</CardTitle>
            <CardDescription>チームIDが発行されました</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-6 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">チームID</p>
              <p className="text-3xl font-mono font-bold tracking-wider" data-testid="text-team-id">{teamId}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">登録情報:</p>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">クラブ名:</span>
                  <span className="font-medium">{formData.clubName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">スポーツ:</span>
                  <Badge variant="outline">{SPORTS.find(s => s.value === formData.sport)?.label}</Badge>
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={() => console.log('ダッシュボードへ')} data-testid="button-go-dashboard">
              ダッシュボードへ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <CardTitle>
            {step === 1 && "基本情報"}
            {step === 2 && "スポーツ選択"}
            {step === 3 && "オーナーアカウント"}
          </CardTitle>
          <CardDescription>
            ステップ {step} / 3
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
            <div className="space-y-4">
              <Label>スポーツを選択してください *</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SPORTS.map((sport) => (
                  <Card
                    key={sport.value}
                    className={`cursor-pointer hover-elevate active-elevate-2 ${
                      formData.sport === sport.value ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => updateField("sport", sport.value)}
                    data-testid={`card-sport-${sport.value}`}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6">
                      <div className="text-4xl mb-2">{sport.icon}</div>
                      <p className="font-medium">{sport.label}</p>
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

          <div className="flex justify-between gap-4 pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              data-testid="button-back"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              戻る
            </Button>
            {step < 3 ? (
              <Button onClick={handleNext} data-testid="button-next">
                次へ
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} data-testid="button-submit">
                登録完了
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
