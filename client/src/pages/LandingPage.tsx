import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCog, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            TEAMO
          </h1>
          <p className="text-xl text-muted-foreground">
            スポーツチーム管理プラットフォーム
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 選手ポータル */}
          <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all" onClick={() => window.location.href = '/player'}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">選手ポータル</CardTitle>
              <CardDescription>
                スケジュール確認・出欠管理
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full" data-testid="button-player-portal">
                選手としてログイン
              </Button>
            </CardContent>
          </Card>

          {/* コーチポータル */}
          <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all" onClick={() => window.location.href = '/team'}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                <UserCog className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">コーチポータル</CardTitle>
              <CardDescription>
                チーム・スケジュール管理
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full" data-testid="button-coach-portal">
                コーチとしてログイン
              </Button>
            </CardContent>
          </Card>

          {/* 管理者ポータル */}
          <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all" onClick={() => window.location.href = '/admins/login'}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">管理者ポータル</CardTitle>
              <CardDescription>
                システム全体の管理
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full" data-testid="button-admin-portal">
                管理者としてログイン
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
