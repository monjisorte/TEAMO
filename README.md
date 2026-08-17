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
手動: `GIT_DIR=/nonexistent vercel --prod --scope sorte3`

## メモ
- 認証はダミー実装（`server/auth.ts`）。本番公開前に要作り直し。
- 設計メモ: `docs/ARCHITECTURE_NOTES.md`（旧 replit.md）
