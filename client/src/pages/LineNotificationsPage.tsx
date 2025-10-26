import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function LineNotificationsPage() {
  // Set page title
  useEffect(() => {
    document.title = "LINE通知 | TEAMOコーチ";
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          LINE通知
        </h1>
        <p className="text-muted-foreground mt-2">
          LINE通知機能（準備中）
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            LINE通知設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-muted-foreground">
            <Bell className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-semibold mb-2">準備中</p>
            <p className="text-sm">
              LINE通知機能は現在開発中です。<br />
              近日中に公開予定です。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
