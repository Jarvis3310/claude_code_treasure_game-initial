# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用指令

```bash
npm install          # 安裝相依套件
npm run dev           # 啟動 Vite 開發伺服器，網址為 http://localhost:3000（會自動開啟瀏覽器）
npm run build         # 建置正式版本到 ./build
npx tsc --noEmit       # 手動執行型別檢查（package.json 未設定對應 script）
```

目前 `package.json` 沒有設定測試指令或 lint 指令。

### Supabase 環境變數

登入／訪客模式／排行榜功能依賴 Supabase，需要在專案根目錄建立 `.env.local`（已被 `.gitignore` 排除，不會被提交），內容參考 `.env.example`：

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

缺少這兩個環境變數時，[src/lib/supabase.ts](src/lib/supabase.ts) 會在啟動時直接丟出錯誤。Supabase 專案需要的 `profiles` 資料表 schema、RLS policy、自動建立 profile 的 trigger，並未包含在程式碼中，schema 定義見 [specs/auth-leaderboard.md](specs/auth-leaderboard.md)，需手動在 Supabase SQL Editor 執行一次。

### 部署（Vercel）

[vercel.json](vercel.json) 已指定 `buildCommand: npm run build`、`outputDirectory: build`，與 `package.json`／`vite.config.ts` 的設定一致。部署請使用 `/deploy_vercel`（[.claude/commands/deploy_vercel.md](.claude/commands/deploy_vercel.md) 定義的自訂 slash command），它會依序檢查 Vercel 登入狀態、確認 production 環境已設定 Supabase 環境變數，再執行 `npx vercel --prod`。同上述本機開發需求，Vercel 專案本身也必須在 production 環境設定 `VITE_SUPABASE_URL`／`VITE_SUPABASE_ANON_KEY`，否則建置出的網站會在啟動時丟出相同錯誤。

### 部署（GitHub Pages）

部署請使用 `/deploy_github_pages`（[.claude/commands/deploy_github_pages.md](.claude/commands/deploy_github_pages.md) 定義的自訂 slash command），它會依序檢查 GitHub CLI 登入狀態、repo 是否存在與可見度（GitHub Pages 免費個人方案只支援 public repo）、`vite.config.ts` 的 `base` 設定，再用 `gh-pages` 套件（`devDependencies`）把 `npm run build` 的產物推送到 `gh-pages` 分支。

[vite.config.ts](vite.config.ts) 的 `base: './'` 是專門為了這個部署方式而加的：GitHub Pages 的專案頁面網址帶有 repo 名稱的子路徑（`https://<owner>.github.io/<repo>/`），若資源路徑是絕對路徑（Vite 預設 `base: '/'`）會全部指向網域根目錄而 404、導致部署後畫面空白；改成相對路徑後，不管部署在子路徑、網域根目錄還是自訂網域都能正確解析，因此不需要因為 Vercel／GitHub Pages 用不同的 `base` 設定分別處理。

因為是純靜態代管，沒有像 Vercel 那樣的伺服器端環境變數設定畫面——Supabase 的兩個環境變數是在 `npm run build` 當下從本機 `.env.local` 讀入並打包進產物的，所以部署前必須確認本機 `.env.local` 內容正確。

## 需求規格文件

[specs/](specs) 目錄記錄各項功能的需求背景、關鍵決策與資料庫 schema，作為比 commit log 更完整的功能開發紀錄。目前有 [specs/auth-leaderboard.md](specs/auth-leaderboard.md)（登入／訪客模式／排行榜功能）。新增重要功能時，比照這份文件的格式（狀態、需求背景、關鍵決策、架構摘要、驗證方式）在此目錄新增一份。

## 架構說明

這是一個 React + TypeScript + Vite 單頁應用程式，實作「從三個寶箱中選一個」的小遊戲，並加上登入／訪客模式與最高分排行榜。核心遊戲邏輯與畫面集中在同一個檔案：

- [src/App.tsx](src/App.tsx) — 整個遊戲的核心：`Box` 狀態（id / isOpen / hasTreasure）、分數計算、勝負結束狀態，以及畫面的 JSX 排版。`initializeGame` 會在元件掛載時與重置遊戲時，隨機把寶藏指派給三個寶箱其中之一；`openBox` 負責打開寶箱、依結果調整分數（找到寶藏 +100，開到骷髏 -50），並在找到寶藏或所有寶箱都被打開後結束遊戲。另外透過 `useAuth()` 串接登入狀態、`AuthModal`（登入／註冊／訪客彈出視窗）與 `Leaderboard`（前 3 名排行榜，用 `Popover` 呈現成懸浮視窗），並在 `gameEnded` 變化時呼叫 `updateHighScore` 寫入分數；`status`（登入狀態）變化時（登入/登出/切換訪客）也會重置遊戲、清空 Auth 表單，避免下一位使用者看到殘留資料。
- [src/main.tsx](src/main.tsx) — 標準的 React root 掛載邏輯，用 `AuthProvider` 包住 `<App />`，並載入 `src/index.css`。
- [src/context/AuthContext.tsx](src/context/AuthContext.tsx) — `AuthProvider` + `useAuth()`，管理 `loading / signed-out / guest / authenticated` 四種狀態，封裝 `signIn`、`signUp`、`signOut`、`playAsGuest`、`updateHighScore`（訪客模式下為 no-op，不寫入資料庫；寫入時前端與 DB 端各做一次「新分數需高於舊分數」的檢查，避免併發覆蓋）。
- [src/lib/supabase.ts](src/lib/supabase.ts) — 建立 Supabase client 單例，並匯出 `Profile` 型別。
- [src/components/AuthModal.tsx](src/components/AuthModal.tsx) — 登入／註冊分頁彈出視窗（`Dialog` + `Tabs` + react-hook-form 的 `Form`/`FormField`/`Controller` 模式），內含「以訪客身分繼續」選項；每次視窗被重新打開時會清空表單與錯誤訊息。
- [src/components/Leaderboard.tsx](src/components/Leaderboard.tsx) — 查詢 `profiles` 資料表最高分前 3 名並顯示。
- [src/assets/](src/assets) — 寶箱美術素材（關閉／開啟／開啟後為骷髏三種狀態）與鑰匙圖示。
- [src/audios/](src/audios) — 開箱音效（一般版本與「邪惡笑聲」版本），由 `App.tsx` 引用播放。
- [src/components/ui/](src/components/ui) — 由 shadcn/ui 產生的元件庫（基於 Radix UI 原生元件與 Tailwind）。請將這些檔案視為產生／vendored 的程式碼：除非有明確需求要修改，否則應優先以組合方式使用它們，而非改寫其內部實作。
- [src/components/figma/ImageWithFallback.tsx](src/components/figma/ImageWithFallback.tsx) — 由 Figma Make 產生的圖片元件，同樣視為產生／vendored 的程式碼。

### `ui/input.tsx`、`ui/button.tsx` 已手動補上 `React.forwardRef`

這是對 vendored 程式碼少數刻意的修改，原因：原始匯出版本的 `Input`／`Button` 都是不帶 `forwardRef` 的純函式元件。這會讓任何「需要拿到底層 DOM ref」的整合悄悄失效且不報錯／或報一個看似無害的 console 警告：
- `Input` 缺 `forwardRef` 時，react-hook-form 的 `register()`（非受控模式）完全讀不到欄位值，導致送出表單時所有欄位都被誤判成空值、觸發 `required` 驗證錯誤，即使畫面上明明有輸入內容。目前 [AuthModal.tsx](src/components/AuthModal.tsx) 已改用 `Form`/`FormField`/`Controller`（受控模式，不依賴 ref）來規避，但 `Input` 本身仍補了 `forwardRef` 作根本修復。
- `Button` 缺 `forwardRef` 時，`PopoverTrigger asChild`（或任何 Radix `asChild` 組合）拿不到觸發元素的真實 DOM 節點，導致 Floating UI 算不出位置，`Popover`/`Tooltip` 等懸浮內容會渲染在錯誤位置（甚至螢幕外）而非緊貼觸發按鈕。

之後如果其他 `ui/*.tsx` 元件也需要搭配 `asChild`、`register()`、或任何依賴 ref 的整合，優先檢查該元件是否也缺 `forwardRef`。

### 模組解析的特殊之處

[vite.config.ts](vite.config.ts) 中定義了明確的 `resolve.alias` 設定，將帶版本號的 import 路徑（例如 `@radix-ui/react-dialog@1.1.6`）對應到未帶版本號的套件名稱，另外也設定了 `'@'` → `./src`。這個專案原本是從 Figma Make／shadcn 匯出而來，因此 `src/components/ui` 下產生的元件可能仍保留帶版本號的 import 寫法，這些寫法只有靠上述 alias 設定才能正確解析。若新增了某個相依套件，而產生的程式碼是以帶版本號的方式 import 它，應該新增對應的 alias 項目，而不是逐一移除每個 import 位置的版本號。

[tsconfig.json](tsconfig.json) 的 `compilerOptions.paths` 出於同樣理由，鏡射了 `vite.config.ts` 裡完整的 alias 清單（讓 `tsc`／編輯器的型別檢查也能解析這些帶版本號的 import）；兩份清單目前是手動同步的，新增 alias 時兩邊都要加。

### ⚠️ Tailwind 沒有即時編譯——`src/index.css` 是靜態快照

這個專案**沒有安裝 `tailwindcss` 套件**（`package.json`、`node_modules` 裡都沒有），也沒有 PostCSS 設定檔或 Tailwind 的 Vite 外掛。[src/index.css](src/index.css)（4000+ 行，開頭寫著 `/*! tailwindcss v4.1.3 */`）是當初從 Figma Make 匯出時**一次性產生的靜態 CSS**，只包含「匯出當下程式碼裡實際用到」的那些 utility class 規則。

**這代表：新增或修改 JSX 裡的 Tailwind class 名稱，不保證會有對應的 CSS 規則存在。** 沒有規則的 class 會被 React 正常渲染到 DOM 上、也不會有任何錯誤或警告，但視覺上完全沒有效果（等同於沒寫這個 class）——非常容易被誤判成「改了但沒生效」的其他原因（快取、HMR 沒更新等），實際上是規則根本不存在。已知會中招的例子：`w-80`、`bg-amber-50`、`bg-amber-100`、`border-amber-300`、`text-green-700`、`border-none`、`sm:max-w-md`、`pt-2`、`space-y-1`。

**因此，新增任何 Tailwind class 之前，務必先確認 `src/index.css` 裡已經有對應規則**（例如 `grep -n "\.w-80 {" src/index.css`），不要假設常見的 Tailwind class 名稱一定存在。若該 class 確實不存在：
- 優先改用同類別中已存在的 class（例如 `bg-amber-200/80` 取代 `bg-amber-50`）
- 需要精確數值（如自訂色碼、任意寬度）時，改用行內 `style={{ ... }}`，這不受此限制影響，保證生效
- 若要徹底解決，需要真的安裝 `tailwindcss` 並接上建置流程（例如 `@tailwindcss/vite` 外掛）——目前使用者選擇先不處理，之後有需要再安裝，**只會安裝在這個專案的 `node_modules`，不影響全域環境或其他專案**。

### 樣式規範

`App.tsx` 中直接大量使用 Tailwind 的 utility class（沒有使用 CSS modules）。整體配色採用琥珀色系（`amber-*`），呼應尋寶主題。動畫效果使用 `motion` 套件（`motion/react`，即改名後的 framer-motion），主要用在寶箱翻轉動畫（`rotateY`）以及點擊時的 hover／tap 縮放效果。
