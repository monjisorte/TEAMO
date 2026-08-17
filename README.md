# TEAMO

クラブチーム向けのスケジュール・出欠・月謝管理アプリ（React + Express + Postgres）。

## 構成（Vercel）
- フロント: Vite ビルド → `dist/public`（静的配信）
- API: `api/index.ts` が Express（`server/app.ts`）を Vercel Function として実行。`/api/*` と `/objects/*` を rewrite（`vercel.json`）
- DB: Neon Postgres（`DATABASE_URL`、Drizzle ORM。スキーマ反映は `npm run db:push`）
- ファイル: Vercel Blob（private ストア `teamo-files`、`BLOB_READ_WRITE_TOKEN`）。`server/objectStorage.ts`
- メール: Resend（`RESEND_API_KEY`）
- 決済: Stripe（`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`。テストキー可）
- リージョン: hnd1（東京）

## 開発
```
npm install
vercel env pull .env.local   # または .env.example を元に .env.local を作成
npm run db:push        # スキーマを DB に反映
npm run dev            # http://localhost:5000
```

## デプロイ
GitHub `main` に push すると Vercel（チーム SORTE / project `teamo`）が自動デプロイ。
本番URL: https://teamo.cloud（お名前.com DNS: A @ → 76.76.21.21 / CNAME www → cname.vercel-dns.com）。Vercel 標準 URL は https://teamo-roan.vercel.app
手動: `GIT_DIR=/nonexistent vercel --prod --scope sorte3`
注意: server/ の相対 import は必ず `.js` 拡張子付き（Vercel が ESM としてそのまま実行するため）

## メモ
- 認証: JWT を HttpOnly Cookie（`teamo_session`, 30日）で発行（`server/auth.ts`）。`SESSION_SECRET` 必須。
  - `/api` 全体で「公開ルート以外はログイン必須」。管理者ルートは admin のみ、選手は許可リストのみ。
  - `server/authz.ts` がパスパラメータ（:teamId / :studentId / :coachId / :id …）と query/body の ID を
    セッションの所属チーム／本人（＋承認済み兄弟）と突き合わせる。一覧 API はセッションのチームに限定。
  - 認可テスト: `scripts/authz_test.sh`（U=<base url> で実行。テスト用チームが DB に残るので後で削除）（2チーム作成し越境アクセスが 403 になることを確認）。
- 設計メモ: `docs/ARCHITECTURE_NOTES.md`（旧 replit.md）
