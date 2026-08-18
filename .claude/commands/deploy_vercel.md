---
description: 將此 Vite + React 專案部署到 Vercel，並回報部署後的網址
---

## 目標

將這個專案部署到 Vercel，部署完成後回報 production 網址，方便使用者打開瀏覽器確認部署結果。

## 執行步驟

1. **確認 Vercel CLI 可用**：用 `npx vercel --version` 即可，不需要全域安裝。

2. **確認登入狀態**：執行 `npx vercel whoami`。
   - 若未登入，**停止並請使用者自行執行 `npx vercel login`**——這個指令需要瀏覽器或 email 連結互動確認，無法由 Claude Code 代為完成。

3. **確認 Supabase 環境變數已設定在 Vercel 專案**：執行 `npx vercel env ls` 檢查 production 環境是否已有 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`（見 [CLAUDE.md](../../CLAUDE.md) 的 Supabase 環境變數說明）。少了任一個，[src/lib/supabase.ts](../../src/lib/supabase.ts) 會在啟動時直接丟出錯誤，登入／訪客模式／排行榜功能全部無法使用。
   - 這兩個值是會被打包進前端 bundle 的公開值（Supabase anon key 設計上就是公開的，資料保護靠 RLS policy），可以安全地放在 Vercel 環境變數。
   - 若缺少，先跟使用者確認要接上哪個 Supabase 專案，再從本機 `.env.local` 取值，用 `npx vercel env add VITE_SUPABASE_URL production`（互動輸入值）逐一新增。不要把值直接寫進 shell 指令參數或印在對話紀錄裡。

4. **部署到 production**：確認上述前置條件都滿足後，執行 `npx vercel --prod --yes`。
   - 首次部署會自動偵測 Vite 專案：build command 為 `npm run build`，output directory 為 `build`（對照 [package.json](../../package.json)、[vite.config.ts](../../vite.config.ts)）。
   - 這會影響公開可存取的網站，是不易復原、可被他人看到的動作，執行前先跟使用者確認一次（除非使用者已明確表示這次不需要再確認）。

5. **回報結果**：從指令輸出擷取最終的 production 網址，直接提供給使用者，並提醒可以打開該網址確認：登入／訪客模式、開寶箱音效與動畫、排行榜懸浮視窗是否正常運作。

## 注意事項

- 不要用 `--force` 或跳過上述確認步驟來加速部署。
- 部署失敗時，先看 `npx vercel --prod --yes` 的錯誤輸出（常見原因：環境變數缺失、或 Node 版本不相容），排查根因，不要用 `--force` 忽略錯誤硬推。
- 每次重新部署都會產生新的 deployment URL，同時更新 production 別名網址；回報時以 production 網址（別名網址，不含隨機 hash 的那個）為主。
