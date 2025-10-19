import { useState } from "react";
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

export default function TuitionPage() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const team = teams[0];

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: payments = [] } = useQuery<TuitionPayment[]>({
    queryKey: [`/api/tuition-payments?year=${selectedYear}&month=${selectedMonth}`],
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async (data: { studentId: string; amount: number; isPaid: boolean; category?: string | null }) => {
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

  const getDefaultAmount = (student: Student) => {
    if (!team) return 0;
    if (student.playerType === "member") {
      return team.monthlyFeeMember || 0;
    } else if (student.playerType === "school") {
      return team.monthlyFeeSchool || 0;
    }
    return 0;
  };

  const handleAmountChange = (studentId: string, amount: number) => {
    const payment = getPaymentForStudent(studentId);
    updatePaymentMutation.mutate({
      studentId,
      amount,
      isPaid: payment?.isPaid || false,
      category: payment?.category || null,
    });
  };

  const handlePaidToggle = (studentId: string, isPaid: boolean) => {
    const payment = getPaymentForStudent(studentId);
    const student = students.find((s) => s.id === studentId);
    updatePaymentMutation.mutate({
      studentId,
      amount: payment?.amount || getDefaultAmount(student!),
      isPaid,
      category: payment?.category || null,
    });
  };

  const handleCategoryChange = (studentId: string, category: string | null) => {
    const payment = getPaymentForStudent(studentId);
    const student = students.find((s) => s.id === studentId);
    updatePaymentMutation.mutate({
      studentId,
      amount: payment?.amount || getDefaultAmount(student!),
      isPaid: payment?.isPaid || false,
      category,
    });
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const totalAmount = students.reduce((sum, student) => {
    const payment = getPaymentForStudent(student.id);
    return sum + (payment?.amount || getDefaultAmount(student));
  }, 0);

  const paidAmount = payments
    .filter((p) => p.isPaid)
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          月謝管理
        </h1>
        <p className="text-muted-foreground mt-2">
          メンバーの月謝の支払い状況を管理します
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              月謝総額
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              支払い済み
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ¥{paidAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              未払い
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ¥{(totalAmount - paidAmount).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>月謝一覧</CardTitle>
              <CardDescription>
                月を選択して支払い状況を管理します
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-28" data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-24" data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {month}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>区分</TableHead>
                <TableHead className="text-right">金額（円）</TableHead>
                <TableHead className="text-center">支払い済み</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const payment = getPaymentForStudent(student.id);
                const defaultAmount = getDefaultAmount(student);
                const amount = payment?.amount || defaultAmount;
                const isPaid = payment?.isPaid || false;
                const category = payment?.category || null;

                return (
                  <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>
                      <Select
                        value={category || "unselected"}
                        onValueChange={(value) => 
                          handleCategoryChange(student.id, value === "unselected" ? null : value)
                        }
                      >
                        <SelectTrigger className="w-32" data-testid={`select-category-${student.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unselected">(未選択)</SelectItem>
                          <SelectItem value="team">チーム</SelectItem>
                          <SelectItem value="school">スクール</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) =>
                          handleAmountChange(student.id, parseInt(e.target.value) || 0)
                        }
                        className="w-32 text-right ml-auto"
                        data-testid={`input-amount-${student.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isPaid}
                        onCheckedChange={(checked) =>
                          handlePaidToggle(student.id, checked as boolean)
                        }
                        data-testid={`checkbox-paid-${student.id}`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {students.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              登録されているメンバーがいません
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
