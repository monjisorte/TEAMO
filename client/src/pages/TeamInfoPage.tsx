import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Team } from "@shared/schema";
import { Edit, X, Check } from "lucide-react";

const SPORT_TYPES = [
  "サッカー",
  "野球",
  "バスケットボール",
  "テニス",
  "ダンス",
  "バドミントン",
  "ラグビー",
  "水泳",
  "その他",
];

export default function TeamInfoPage() {
  const { toast } = useToast();
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [isEditingFees, setIsEditingFees] = useState(false);
  
  // Get coach's teamId and role from localStorage
  const [teamId, setTeamId] = useState<string | null>(null);
  const [coachData, setCoachData] = useState<{ 
    id: string;
    lastName: string; 
    firstName: string; 
    email: string; 
    role: string;
  } | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const savedCoach = localStorage.getItem("coachData");
    if (savedCoach) {
      const coach = JSON.parse(savedCoach);
      setTeamId(coach.teamId);
      setCoachData({ 
        id: coach.id,
        lastName: coach.lastName, 
        firstName: coach.firstName, 
        email: coach.email,
        role: coach.role,
      });
      setIsOwner(coach.role === "owner");
    }
  }, []);

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Find the correct team based on coach's teamId
  const team = teams.find(t => t.id === teamId);

  const [formData, setFormData] = useState({
    name: team?.name || "",
    representativeEmail: team?.representativeEmail || team?.contactEmail || "",
    address: team?.address || "",
    sportType: team?.sportType || "",
    monthlyFeeMember: team?.monthlyFeeMember || 0,
    monthlyFeeSchool: team?.monthlyFeeSchool || 0,
    siblingDiscount: team?.siblingDiscount || 0,
    annualFee: team?.annualFee || 0,
    entranceFee: team?.entranceFee || 0,
    insuranceFee: team?.insuranceFee || 0,
    annualFeeMonth: team?.annualFeeMonth || 4,
    insuranceFeeMonth: team?.insuranceFeeMonth || 4,
  });

  // team データが更新されたら formData も更新
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || "",
        representativeEmail: team.representativeEmail || team.contactEmail || (coachData?.email || ""),
        address: team.address || "",
        sportType: team.sportType || "",
        monthlyFeeMember: team.monthlyFeeMember || 0,
        monthlyFeeSchool: team.monthlyFeeSchool || 0,
        siblingDiscount: team.siblingDiscount || 0,
        annualFee: team.annualFee || 0,
        entranceFee: team.entranceFee || 0,
        insuranceFee: team.insuranceFee || 0,
        annualFeeMonth: team.annualFeeMonth || 4,
        insuranceFeeMonth: team.insuranceFeeMonth || 4,
      });
    }
  }, [team, coachData]);

  const updateTeamMutation = useMutation({
    mutationFn: async (data: Partial<Team>) => {
      if (!team) throw new Error("No team found");
      if (!coachData?.id) throw new Error("Coach ID not found");
      // Include coachId for server-side authorization
      return await apiRequest("PUT", `/api/teams/${team.id}`, {
        ...data,
        coachId: coachData.id,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "保存成功",
        description: "チーム情報を更新しました",
      });
      setIsEditingBasicInfo(false);
      setIsEditingFees(false);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "更新中にエラーが発生しました",
        variant: "destructive",
      });
    },
  });

  const handleSaveBasicInfo = () => {
    updateTeamMutation.mutate({
      name: formData.name,
      representativeEmail: formData.representativeEmail,
      address: formData.address,
      sportType: formData.sportType,
    });
  };

  const handleSaveFees = () => {
    updateTeamMutation.mutate({
      monthlyFeeMember: formData.monthlyFeeMember,
      monthlyFeeSchool: formData.monthlyFeeSchool,
      siblingDiscount: formData.siblingDiscount,
      annualFee: formData.annualFee,
      entranceFee: formData.entranceFee,
      insuranceFee: formData.insuranceFee,
      annualFeeMonth: formData.annualFeeMonth,
      insuranceFeeMonth: formData.insuranceFeeMonth,
    });
  };

  const handleCancelBasicInfo = () => {
    if (team) {
      setFormData({
        ...formData,
        name: team.name || "",
        representativeEmail: team.representativeEmail || team.contactEmail || "",
        address: team.address || "",
        sportType: team.sportType || "",
      });
    }
    setIsEditingBasicInfo(false);
  };

  const handleCancelFees = () => {
    if (team) {
      setFormData({
        ...formData,
        monthlyFeeMember: team.monthlyFeeMember || 0,
        monthlyFeeSchool: team.monthlyFeeSchool || 0,
        siblingDiscount: team.siblingDiscount || 0,
        annualFee: team.annualFee || 0,
        entranceFee: team.entranceFee || 0,
        insuranceFee: team.insuranceFee || 0,
        annualFeeMonth: team.annualFeeMonth || 4,
        insuranceFeeMonth: team.insuranceFeeMonth || 4,
      });
    }
    setIsEditingFees(false);
  };

  if (isLoading || !teamId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          チームが見つかりません。先にチームを作成してください。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          チーム情報
        </h1>
        <p className="text-muted-foreground mt-2">
          チームの基本情報と料金設定を管理します
        </p>
      </div>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>
                {isOwner ? "チームの基本情報を入力してください" : "チームの基本情報（閲覧のみ）"}
              </CardDescription>
            </div>
            {!isEditingBasicInfo && isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingBasicInfo(true)}
                data-testid="button-edit-basic-info"
              >
                <Edit className="w-4 h-4 mr-2" />
                編集
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingBasicInfo ? (
            <>
              <div>
                <Label htmlFor="team-name">チーム名</Label>
                <Input
                  id="team-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="チーム名を入力"
                  data-testid="input-team-name"
                />
              </div>

              <div>
                <Label htmlFor="rep-email">代表メールアドレス</Label>
                <Input
                  id="rep-email"
                  type="email"
                  value={formData.representativeEmail}
                  onChange={(e) => setFormData({ ...formData, representativeEmail: e.target.value })}
                  placeholder="contact@example.com"
                  data-testid="input-representative-email"
                />
              </div>

              <div>
                <Label htmlFor="address">住所(主な練習拠点)</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="東京都渋谷区..."
                  data-testid="input-address"
                />
              </div>

              <div>
                <Label htmlFor="sport-type">スポーツ名</Label>
                <Select
                  value={formData.sportType}
                  onValueChange={(value) => setFormData({ ...formData, sportType: value })}
                >
                  <SelectTrigger id="sport-type" data-testid="select-sport-type">
                    <SelectValue placeholder="スポーツを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORT_TYPES.map((sport) => (
                      <SelectItem key={sport} value={sport}>
                        {sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveBasicInfo}
                  disabled={updateTeamMutation.isPending}
                  data-testid="button-save-basic-info"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {updateTeamMutation.isPending ? "保存中..." : "保存"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelBasicInfo}
                  disabled={updateTeamMutation.isPending}
                  data-testid="button-cancel-basic-info"
                >
                  <X className="w-4 h-4 mr-2" />
                  キャンセル
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">チーム名</Label>
                <p className="text-sm font-medium" data-testid="text-team-name">
                  {team.name || "未設定"}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">代表メールアドレス</Label>
                <p className="text-sm font-medium" data-testid="text-representative-email">
                  {team.representativeEmail || team.contactEmail || coachData?.email || "未設定"}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">住所(主な練習拠点)</Label>
                <p className="text-sm font-medium" data-testid="text-address">
                  {team.address || "未設定"}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">スポーツ名</Label>
                <p className="text-sm font-medium" data-testid="text-sport-type">
                  {team.sportType || "未設定"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 料金設定 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>料金設定</CardTitle>
              <CardDescription>
                {isOwner ? "月謝や年会費の設定を行います" : "料金設定（閲覧のみ）"}
              </CardDescription>
            </div>
            {!isEditingFees && isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingFees(true)}
                data-testid="button-edit-fees"
              >
                <Edit className="w-4 h-4 mr-2" />
                編集
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingFees ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fee-member">チーム生の月会費（円）</Label>
                  <Input
                    id="fee-member"
                    type="number"
                    value={formData.monthlyFeeMember}
                    onChange={(e) => setFormData({ ...formData, monthlyFeeMember: parseInt(e.target.value) || 0 })}
                    placeholder="5000"
                    data-testid="input-monthly-fee-member"
                  />
                </div>
                <div>
                  <Label htmlFor="fee-school">スクール生の月会費（円）</Label>
                  <Input
                    id="fee-school"
                    type="number"
                    value={formData.monthlyFeeSchool}
                    onChange={(e) => setFormData({ ...formData, monthlyFeeSchool: parseInt(e.target.value) || 0 })}
                    placeholder="8000"
                    data-testid="input-monthly-fee-school"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sibling-discount">兄弟割引額（円）</Label>
                  <Input
                    id="sibling-discount"
                    type="number"
                    value={formData.siblingDiscount}
                    onChange={(e) => setFormData({ ...formData, siblingDiscount: parseInt(e.target.value) || 0 })}
                    placeholder="1000"
                    data-testid="input-sibling-discount"
                  />
                </div>
                <div>
                  <Label htmlFor="entrance-fee">入会金（円）</Label>
                  <Input
                    id="entrance-fee"
                    type="number"
                    value={formData.entranceFee}
                    onChange={(e) => setFormData({ ...formData, entranceFee: parseInt(e.target.value) || 0 })}
                    placeholder="5000"
                    data-testid="input-entrance-fee"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="annual-fee">年会費（円）</Label>
                  <Input
                    id="annual-fee"
                    type="number"
                    value={formData.annualFee}
                    onChange={(e) => setFormData({ ...formData, annualFee: parseInt(e.target.value) || 0 })}
                    placeholder="10000"
                    data-testid="input-annual-fee"
                  />
                </div>
                <div>
                  <Label htmlFor="annual-fee-month">年会費課金月</Label>
                  <Select
                    value={formData.annualFeeMonth.toString()}
                    onValueChange={(value) => setFormData({ ...formData, annualFeeMonth: parseInt(value) })}
                  >
                    <SelectTrigger id="annual-fee-month" data-testid="select-annual-fee-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {month}月
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="insurance-fee">保険料（円）</Label>
                  <Input
                    id="insurance-fee"
                    type="number"
                    value={formData.insuranceFee}
                    onChange={(e) => setFormData({ ...formData, insuranceFee: parseInt(e.target.value) || 0 })}
                    placeholder="3000"
                    data-testid="input-insurance-fee"
                  />
                </div>
                <div>
                  <Label htmlFor="insurance-fee-month">保険料課金月</Label>
                  <Select
                    value={formData.insuranceFeeMonth.toString()}
                    onValueChange={(value) => setFormData({ ...formData, insuranceFeeMonth: parseInt(value) })}
                  >
                    <SelectTrigger id="insurance-fee-month" data-testid="select-insurance-fee-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {month}月
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveFees}
                  disabled={updateTeamMutation.isPending}
                  data-testid="button-save-fees"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {updateTeamMutation.isPending ? "保存中..." : "保存"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelFees}
                  disabled={updateTeamMutation.isPending}
                  data-testid="button-cancel-fees"
                >
                  <X className="w-4 h-4 mr-2" />
                  キャンセル
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">チーム生の月会費</Label>
                  <p className="text-sm font-medium" data-testid="text-monthly-fee-member">
                    ¥{team.monthlyFeeMember?.toLocaleString() || "0"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">スクール生の月会費</Label>
                  <p className="text-sm font-medium" data-testid="text-monthly-fee-school">
                    ¥{team.monthlyFeeSchool?.toLocaleString() || "0"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">兄弟割引額</Label>
                  <p className="text-sm font-medium" data-testid="text-sibling-discount">
                    ¥{team.siblingDiscount?.toLocaleString() || "0"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">入会金</Label>
                  <p className="text-sm font-medium" data-testid="text-entrance-fee">
                    ¥{team.entranceFee?.toLocaleString() || "0"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">年会費</Label>
                  <p className="text-sm font-medium" data-testid="text-annual-fee">
                    ¥{team.annualFee?.toLocaleString() || "0"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">年会費課金月</Label>
                  <p className="text-sm font-medium" data-testid="text-annual-fee-month">
                    {team.annualFeeMonth || 4}月
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">保険料</Label>
                  <p className="text-sm font-medium" data-testid="text-insurance-fee">
                    ¥{team.insuranceFee?.toLocaleString() || "0"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">保険料課金月</Label>
                  <p className="text-sm font-medium" data-testid="text-insurance-fee-month">
                    {team.insuranceFeeMonth || 4}月
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
