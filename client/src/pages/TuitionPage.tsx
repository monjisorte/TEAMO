import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Student, TuitionPayment, Team } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function TuitionPage() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [editingValues, setEditingValues] = useState<Record<string, {
    baseAmount?: number;
    discount?: number;
    enrollmentOrAnnualFee?: number;
    spotFee?: number;
    amount?: number;
  }>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [teamSettings, setTeamSettings] = useState({
    monthlyFeeMember: 0,
    monthlyFeeSchool: 0,
    annualFee: 0,
    siblingDiscount: 0,
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const team = teams[0];

  useEffect(() => {
    if (team) {
      setTeamSettings({
        monthlyFeeMember: team.monthlyFeeMember || 0,
        monthlyFeeSchool: team.monthlyFeeSchool || 0,
        annualFee: team.annualFee || 0,
        siblingDiscount: team.siblingDiscount || 0,
      });
    }
  }, [team]);

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students", team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const res = await fetch(`/api/students?teamId=${team.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: !!team?.id,
  });

  const { data: payments = [], isLoading } = useQuery<TuitionPayment[]>({
    queryKey: [`/api/tuition-payments?year=${selectedYear}&month=${selectedMonth}`],
  });

  const autoGenerateMutation = useMutation({
    mutationFn: async () => {
      if (!team) throw new Error("チームが見つかりません");
      const response = await apiRequest("POST", "/api/tuition-payments/auto-generate", {
        teamId: team.id,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tuition-payments?year=${selectedYear}&month=${selectedMonth}`] 
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/students"]
      });
      
      const count = data.generatedCount || 0;
      toast({
        title: count > 0 ? "自動生成成功" : "自動生成完了",
        description: count > 0 
          ? `${count}件の月謝データを生成しました` 
          : "生成すべき新しい月謝データはありませんでした（既に全て作成済みです）",
      });
    },
    onError: (error: any) => {
      console.error("Auto-generate error:", error);
      toast({
        title: "エラー",
        description: error.message || "月謝データの生成に失敗しました",
        variant: "destructive",
      });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async (data: { 
      studentId: string; 
      baseAmount?: number;
      discount?: number;
      enrollmentOrAnnualFee?: number;
      spotFee?: number;
      amount?: number; 
      isPaid?: boolean; 
      category?: string | null 
    }) => {
      return await apiRequest("POST", "/api/tuition-payments", {
        ...data,
        year: selectedYear,
        month: selectedMonth,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tuition-payments?year=${selectedYear}&month=${selectedMonth}`] 
      });
      toast({
        title: "更新成功",
        description: "月謝情報を更新しました",
      });
    },
  });

  const getPaymentForStudent = (studentId: string) => {
    return payments.find((p) => p.studentId === studentId);
  };

  const getDefaultBaseAmount = (student: Student) => {
    if (!team) return 0;
    if (student.playerType === "member") {
      return team.monthlyFeeMember || 0;
    } else if (student.playerType === "school") {
      return team.monthlyFeeSchool || 0;
    }
    return 0;
  };

  const getDefaultEnrollmentOrAnnualFee = () => {
    if (!team) return 0;
    // 4月には年会費を自動設定
    if (selectedMonth === 4) {
      return team.annualFee || 0;
    }
    return 0;
  };

  const getEditingValue = (studentId: string, field: keyof typeof editingValues[string], defaultValue: number) => {
    return editingValues[studentId]?.[field] ?? defaultValue;
  };

  const setEditingValue = (studentId: string, field: keyof typeof editingValues[string], value: number) => {
    setEditingValues(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      }
    }));
  };

  const calculateTotal = (studentId: string) => {
    const payment = getPaymentForStudent(studentId);
    const student = students.find(s => s.id === studentId);
    
    const baseAmount = getEditingValue(
      studentId, 
      'baseAmount', 
      payment?.baseAmount ?? getDefaultBaseAmount(student!)
    );
    const discount = getEditingValue(studentId, 'discount', payment?.discount ?? 0);
    const enrollmentOrAnnualFee = getEditingValue(
      studentId, 
      'enrollmentOrAnnualFee', 
      payment?.enrollmentOrAnnualFee ?? getDefaultEnrollmentOrAnnualFee()
    );
    const spotFee = getEditingValue(studentId, 'spotFee', payment?.spotFee ?? 0);
    
    return baseAmount - discount + enrollmentOrAnnualFee + spotFee;
  };

  const handleFieldUpdate = (studentId: string, field: 'baseAmount' | 'discount' | 'enrollmentOrAnnualFee' | 'spotFee' | 'amount') => {
    const payment = getPaymentForStudent(studentId);
    const student = students.find(s => s.id === studentId);
    const value = editingValues[studentId]?.[field];
    
    if (value === undefined) return;

    // 他のフィールドの現在の値を取得
    const baseAmount = field === 'baseAmount' ? value : (payment?.baseAmount ?? getDefaultBaseAmount(student!));
    const discount = field === 'discount' ? value : (payment?.discount ?? 0);
    const enrollmentOrAnnualFee = field === 'enrollmentOrAnnualFee' ? value : (payment?.enrollmentOrAnnualFee ?? getDefaultEnrollmentOrAnnualFee());
    const spotFee = field === 'spotFee' ? value : (payment?.spotFee ?? 0);
    
    // 合計金額を計算（手動編集の場合は編集値を使用）
    const amount = field === 'amount' ? value : (baseAmount - discount + enrollmentOrAnnualFee + spotFee);

    updatePaymentMutation.mutate({
      studentId,
      baseAmount,
      discount,
      enrollmentOrAnnualFee,
      spotFee,
      amount,
      isPaid: payment?.isPaid || false,
      category: payment?.category || (student?.playerType === "member" ? "team" : student?.playerType === "school" ? "school" : null),
    });

    // 編集値をクリア
    setEditingValues(prev => {
      const newValues = { ...prev };
      delete newValues[studentId];
      return newValues;
    });
  };

  const handlePaidToggle = (studentId: string, isPaid: boolean) => {
    const payment = getPaymentForStudent(studentId);
    const student = students.find((s) => s.id === studentId);
    
    updatePaymentMutation.mutate({
      studentId,
      baseAmount: payment?.baseAmount ?? getDefaultBaseAmount(student!),
      discount: payment?.discount ?? 0,
      enrollmentOrAnnualFee: payment?.enrollmentOrAnnualFee ?? getDefaultEnrollmentOrAnnualFee(),
      spotFee: payment?.spotFee ?? 0,
      amount: payment?.amount ?? calculateTotal(studentId),
      isPaid,
      category: payment?.category || (student?.playerType === "member" ? "team" : student?.playerType === "school" ? "school" : null),
    });
  };

  const updateStudentPlayerTypeMutation = useMutation({
    mutationFn: async (data: { studentId: string; playerType: string | null }) => {
      return await apiRequest("PATCH", `/api/student/${data.studentId}`, {
        playerType: data.playerType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/students"]
      });
    },
  });

  const updateTeamSettingsMutation = useMutation({
    mutationFn: async (data: {
      monthlyFeeMember: number;
      monthlyFeeSchool: number;
      annualFee: number;
      siblingDiscount: number;
    }) => {
      if (!team) throw new Error("チームが見つかりません");
      return await apiRequest("PUT", `/api/teams/${team.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/teams"]
      });
      setShowSettings(false);
      toast({
        title: "設定を更新しました",
        description: "月謝の基本設定を保存しました",
      });
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "設定の更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleCategoryChange = async (studentId: string, category: string | null) => {
    const payment = getPaymentForStudent(studentId);
    const student = students.find((s) => s.id === studentId);
    
    // categoryに基づいてplayerTypeを更新
    const playerType = category === "team" ? "member" : category === "school" ? "school" : null;
    
    // まず月謝データを更新
    updatePaymentMutation.mutate({
      studentId,
      baseAmount: payment?.baseAmount ?? getDefaultBaseAmount(student!),
      discount: payment?.discount ?? 0,
      enrollmentOrAnnualFee: payment?.enrollmentOrAnnualFee ?? getDefaultEnrollmentOrAnnualFee(),
      spotFee: payment?.spotFee ?? 0,
      amount: payment?.amount ?? calculateTotal(studentId),
      isPaid: payment?.isPaid || false,
      category,
    });

    // 次にstudentのplayerTypeも更新（区分を保存）
    updateStudentPlayerTypeMutation.mutate({
      studentId,
      playerType,
    });
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const totalAmount = students.reduce((sum, student) => {
    const payment = getPaymentForStudent(student.id);
    return sum + (payment?.amount ?? calculateTotal(student.id));
  }, 0);

  const paidAmount = payments
    .filter((p) => p.isPaid)
    .reduce((sum, p) => sum + p.amount, 0);

  const unpaidAmount = totalAmount - paidAmount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            月謝管理
          </h1>
          <p className="text-muted-foreground mt-2">
            メンバーの月謝の支払い状況を管理します
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-team-settings" className="w-full sm:w-auto">
                <Settings className="mr-2 h-4 w-4" />
                月謝設定
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>月謝の基本設定</DialogTitle>
                <DialogDescription>
                  チーム生・スクール生の月謝、年会費、兄弟割引を設定します
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyFeeMember">チーム生の月謝 (円)</Label>
                  <Input
                    id="monthlyFeeMember"
                    type="number"
                    value={teamSettings.monthlyFeeMember}
                    onChange={(e) => setTeamSettings(prev => ({ ...prev, monthlyFeeMember: Number(e.target.value) }))}
                    data-testid="input-monthly-fee-member"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyFeeSchool">スクール生の月謝 (円)</Label>
                  <Input
                    id="monthlyFeeSchool"
                    type="number"
                    value={teamSettings.monthlyFeeSchool}
                    onChange={(e) => setTeamSettings(prev => ({ ...prev, monthlyFeeSchool: Number(e.target.value) }))}
                    data-testid="input-monthly-fee-school"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annualFee">年会費 (円)</Label>
                  <Input
                    id="annualFee"
                    type="number"
                    value={teamSettings.annualFee}
                    onChange={(e) => setTeamSettings(prev => ({ ...prev, annualFee: Number(e.target.value) }))}
                    data-testid="input-annual-fee"
                  />
                  <p className="text-xs text-muted-foreground">毎年4月に自動的に追加されます</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siblingDiscount">兄弟割引 (円)</Label>
                  <Input
                    id="siblingDiscount"
                    type="number"
                    value={teamSettings.siblingDiscount}
                    onChange={(e) => setTeamSettings(prev => ({ ...prev, siblingDiscount: Number(e.target.value) }))}
                    data-testid="input-sibling-discount"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                  data-testid="button-cancel-settings"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => updateTeamSettingsMutation.mutate(teamSettings)}
                  disabled={updateTeamSettingsMutation.isPending}
                  data-testid="button-save-settings"
                >
                  保存
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            onClick={() => autoGenerateMutation.mutate()}
            disabled={autoGenerateMutation.isPending || !team}
            data-testid="button-auto-generate"
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${autoGenerateMutation.isPending ? 'animate-spin' : ''}`} />
            月謝データ自動生成
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">合計請求額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedYear}年{selectedMonth}月
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">入金済み</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">¥{paidAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.filter(p => p.isPaid).length} / {students.length} 名
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">未収金</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">¥{unpaidAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.filter(p => !p.isPaid).length} 名未入金
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>月謝一覧</CardTitle>
            <div className="flex gap-2">
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[120px]" data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[100px]" data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={String(month)}>
                      {month}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>
            メンバーごとの月謝の詳細と支払い状況
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>区分</TableHead>
                  <TableHead className="text-right">月謝</TableHead>
                  <TableHead className="text-right">割引</TableHead>
                  <TableHead className="text-right">入会/年会費</TableHead>
                  <TableHead className="text-right">スポット</TableHead>
                  <TableHead className="text-right">合計金額(円)</TableHead>
                  <TableHead className="text-center">ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      メンバーが登録されていません
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => {
                    const payment = getPaymentForStudent(student.id);
                    const baseAmount = payment?.baseAmount ?? getDefaultBaseAmount(student);
                    const discount = payment?.discount ?? 0;
                    const enrollmentOrAnnualFee = payment?.enrollmentOrAnnualFee ?? getDefaultEnrollmentOrAnnualFee();
                    const spotFee = payment?.spotFee ?? 0;
                    const amount = payment?.amount ?? calculateTotal(student.id);

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>
                          <Select
                            value={payment?.category || (student.playerType === "member" ? "team" : student.playerType === "school" ? "school" : "unset")}
                            onValueChange={(value) => handleCategoryChange(student.id, value === "unset" ? null : value)}
                            data-testid={`select-category-${student.id}`}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="team">チーム</SelectItem>
                              <SelectItem value="school">スクール</SelectItem>
                              <SelectItem value="unset">(未選択)</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={getEditingValue(student.id, 'baseAmount', baseAmount)}
                            onChange={(e) => setEditingValue(student.id, 'baseAmount', parseInt(e.target.value) || 0)}
                            onBlur={() => handleFieldUpdate(student.id, 'baseAmount')}
                            className="w-24 text-right"
                            data-testid={`input-base-amount-${student.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={getEditingValue(student.id, 'discount', discount)}
                            onChange={(e) => setEditingValue(student.id, 'discount', parseInt(e.target.value) || 0)}
                            onBlur={() => handleFieldUpdate(student.id, 'discount')}
                            className="w-24 text-right"
                            data-testid={`input-discount-${student.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={getEditingValue(student.id, 'enrollmentOrAnnualFee', enrollmentOrAnnualFee)}
                            onChange={(e) => setEditingValue(student.id, 'enrollmentOrAnnualFee', parseInt(e.target.value) || 0)}
                            onBlur={() => handleFieldUpdate(student.id, 'enrollmentOrAnnualFee')}
                            className="w-24 text-right"
                            data-testid={`input-enrollment-fee-${student.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={getEditingValue(student.id, 'spotFee', spotFee)}
                            onChange={(e) => setEditingValue(student.id, 'spotFee', parseInt(e.target.value) || 0)}
                            onBlur={() => handleFieldUpdate(student.id, 'spotFee')}
                            className="w-24 text-right"
                            data-testid={`input-spot-fee-${student.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={getEditingValue(student.id, 'amount', amount)}
                            onChange={(e) => setEditingValue(student.id, 'amount', parseInt(e.target.value) || 0)}
                            onBlur={() => handleFieldUpdate(student.id, 'amount')}
                            className="w-28 text-right font-semibold"
                            data-testid={`input-total-amount-${student.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={payment?.isPaid || false}
                            onCheckedChange={(checked) => handlePaidToggle(student.id, checked as boolean)}
                            data-testid={`checkbox-paid-${student.id}`}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
