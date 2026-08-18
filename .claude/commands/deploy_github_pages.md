---
description: 將此 Vite + React 專案部署到 GitHub Pages，並回報部署後的網址
---

## 目標

把這個專案的靜態建置產物部署到 GitHub Pages，部署完成後回報網址，方便使用者打開瀏覽器確認部署結果。

## 執行步驟

1. **確認 GitHub CLI 已登入**：執行 `gh auth status`。
   - 若未登入，**引導使用者執行 `gh auth login`**（互動式 OAuth 流程，需要瀏覽器授權，無法由 Claude Code 代為完成）並等待使用者確認完成後再繼續。

2. **確認是否已有 GitHub repo**：執行 `git remote get-url origin`（失敗代表沒有 remote）。
   - **沒有 remote／repo 時**：先詢問使用者 repo 名稱與要建立 public 還是 private（GitHub Pages 在免費個人方案下，只有 **public repo** 才能發布網站；private repo 需要 GitHub Pro/Team/Enterprise），確認後用 `gh repo create <name> --public --source=. --push`（或使用者指定的可見度）建立並推送。
   - **已有 remote 時**：用 `gh repo view --json visibility,nameWithOwner` 確認目前可見度。
     - 若是 `PRIVATE` 且使用者方案不支援 private Pages，**停下來跟使用者確認**是否要改成 public（`gh repo edit --visibility public --accept-visibility-change-consequences`）——這是會讓所有程式碼公開可見的動作，必須明確取得同意才能執行，不要自行決定。

3. **確認 `vite.config.ts` 的 `base` 設定**：GitHub Pages 專案頁面網址是 `https://<owner>.github.io/<repo>/`（帶 repo 名稱的子路徑），若 [vite.config.ts](../../vite.config.ts) 的 `build` 設定沒有 `base: './'`（相對路徑），打包出來的資源路徑會指向網站根目錄，導致部署後畫面空白、資源全部 404。
   - 檢查後若缺少，於 `build: { ... }` 區塊加入 `base: './'`（相對路徑對任何子路徑或自訂網域都通用，不需要每次依 repo 名稱調整）。

4. **確認 `gh-pages` 套件可用**：檢查 `package.json` 的 `devDependencies` 是否已有 `gh-pages`；沒有的話執行 `npm install --save-dev gh-pages`。

5. **建置專案**：執行 `npm run build`（輸出到 [package.json](../../package.json)／[vite.config.ts](../../vite.config.ts) 設定的 `build` 目錄）。本機的 `.env.local`（見 [CLAUDE.md](../../CLAUDE.md) 的 Supabase 環境變數說明）會在這一步被讀入並打包進產物，GitHub Pages 純靜態代管沒有另外設定環境變數的地方，所以部署前務必確認本機 `.env.local` 已填好正確的 Supabase 專案值。

6. **部署到 `gh-pages` 分支**：執行 `npx gh-pages -d build`（`-d` 指向第 5 步的輸出目錄），這會建立/更新遠端的 `gh-pages` 分支並直接 push 到 `origin`——這是會被其他人看到的動作，**第一次執行前跟使用者確認**（之後同一個 repo 重新部署可視為使用者已預期的操作，不必每次都問）。

7. **確認／啟用 GitHub Pages**：執行 `gh api repos/{owner}/{repo}/pages` 檢查是否已設定。
   - 若回傳 404（尚未啟用），執行 `gh api repos/{owner}/{repo}/pages -X POST -f "source[branch]=gh-pages" -f "source[path]=/"` 啟用。
   - 若已存在但來源分支不是 `gh-pages`，執行對應的 `PUT` 更新來源設定。

8. **回報網址**：組出網址 `https://<owner>.github.io/<repo>/`（若 repo 名稱本身就是 `<owner>.github.io`，網址則是網域根目錄 `https://<owner>.github.io/`），提供給使用者，並提醒：
   - 首次啟用或剛部署完，GitHub Pages 通常需要 1–2 分鐘才會生效，可能要重整幾次。
   - 打開網址後確認登入／訪客模式、開寶箱音效與動畫、排行榜懸浮視窗是否正常運作。

## 注意事項

- 涉及「建立新 repo」「把 private repo 改成 public」的步驟一定要先取得使用者明確同意，不要自行判斷後直接執行。
- 不要用 `--force` 跳過確認或忽略錯誤。
- 部署後畫面空白／資源 404，優先檢查第 3 步的 `base` 設定是否漏掉，這是 GitHub Pages 子路徑部署最常見的錯誤原因。
- 若使用者已用 `/deploy_vercel` 部署過，兩者可以並存，不需要互相取代。
