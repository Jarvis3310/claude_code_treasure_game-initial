# 登入／登出 + 訪客模式 + 最高分排行榜

## 狀態

已完成並通過整合測試。

## 需求背景

原本 `App.tsx` 是純前端小遊戲，沒有任何帳號系統，分數不會被保存。需求是加上：

- 登入／註冊／登出流程
- 不登入也能以「訪客」身分玩（訪客分數不儲存）
- 記錄玩家名稱與個人最高分
- 提供前 3 名的公開排行榜

資料庫要求：免費、託管在雲端，不裝在本機（避免佔用本機容量）。

## 關鍵決策

| 決策點 | 選擇 | 原因 |
|---|---|---|
| 資料庫／認證服務 | Supabase（Postgres + 內建 Auth） | 免費額度足夠，JS SDK 可直接從瀏覽器呼叫，不需要自建後端 |
| UI 呈現方式 | 彈出視窗（shadcn `Dialog`） | 不引入 `react-router-dom`，不做獨立路由頁面 |
| 分數功能範圍 | 個人最高分 + 全站前 3 名排行榜 | 不只做個人分數，也要有公開排行榜；訪客遊玩不寫入資料庫 |

## 架構摘要

- **`src/lib/supabase.ts`** — Supabase client 單例，讀取 `VITE_SUPABASE_URL`／`VITE_SUPABASE_ANON_KEY` 環境變數；缺少時啟動即拋錯。匯出 `Profile` 型別。
- **`src/context/AuthContext.tsx`** — `AuthProvider` + `useAuth()`，管理四種狀態 `loading / signed-out / guest / authenticated`；封裝 `signIn`、`signUp`、`signOut`、`playAsGuest`、`updateHighScore`。
- **`src/components/AuthModal.tsx`** — 登入／註冊分頁彈出視窗，`Dialog` + `Tabs` + react-hook-form 的 `Form`/`FormField`/`Controller`（受控模式），內含「以訪客身分繼續」選項。
- **`src/components/Leaderboard.tsx`** — 查詢 `profiles` 表最高分前 3 名並顯示，以懸浮視窗（`Popover`）形式呈現於 `App.tsx`。
- **`src/App.tsx`** — 串接 `useAuth()`；`status` 變化（登入/登出/切換訪客）時重置遊戲、清空 Auth 表單；`gameEnded` 變化時呼叫 `updateHighScore` 並刷新排行榜。

## 資料庫 Schema（Supabase，已由使用者手動建置）

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  high_score integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public read for leaderboard"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, high_score)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    0
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

要點：`profiles` 表刻意與 Supabase 內建的 `auth.users`（儲存 email／雜湊密碼，由 Supabase Auth 服務管理，前端不可直接查詢）分開，`profiles` 只放應用程式自己的公開資料（username、high_score）。前端不需要 `insert` policy，因為 row 由上面的 `SECURITY DEFINER` trigger 建立。

分數寫入採雙重防護，避免併發覆蓋較高分：前端先檢查 `score > profile.high_score`，DB 端 `update ... where high_score < newScore` 再做一次檢查。訪客模式下 `updateHighScore` 為 no-op，不寫入資料庫。

## 整合測試中發現並修復的問題

1. **瀏覽器自動帶入預設帳密** — 幫每個欄位加上明確的 `autoComplete`（`off` 或 `new-password`）+ `data-lpignore`／`data-1p-ignore`；表單標籤本身也加 `autoComplete="off"`。若瀏覽器已「儲存」過某組密碼（例如手動測試時存下的 `admin`），這些屬性無法強制關閉，需使用者自行到 `chrome://settings/passwords` 刪除該筆已儲存憑證。

2. **Sign Up 送出後所有欄位誤判為必填錯誤** — 根本原因是 vendored 的 `ui/input.tsx`／`ui/button.tsx` 原本沒有 `React.forwardRef`，導致 react-hook-form 的 `register()`（非受控模式，依賴 ref 讀值）完全讀不到欄位值。修復：`AuthModal.tsx` 改用 `Form`/`FormField`/`Controller`（受控模式，不依賴 ref）；另外仍替 `Input`／`Button` 補上 `forwardRef` 作為根本修復，因為 `Button` 缺 `forwardRef` 也會讓 `PopoverTrigger asChild` 抓不到真實 DOM 節點，造成 Popover／Tooltip 定位錯誤（詳見 [CLAUDE.md](../CLAUDE.md)）。

3. **`profiles` 表為何沒有 email／密碼欄位** — 非缺陷。Email 與雜湊密碼由 Supabase 內建的 `auth.users` 管理，`profiles` 刻意只存應用程式自己的公開資料，是 Supabase 官方推薦的標準架構。

## 已知限制／技術債

- `src/index.css` 是靜態 Tailwind 快照，非即時編譯，新增 class 需先確認 `index.css` 內已有對應規則（詳見 [CLAUDE.md](../CLAUDE.md)）。安裝真正的 Tailwind build 已由使用者確認延後處理，之後有需要會另行提出。
- Radix `DialogOverlay` 仍有一個底層 ref 警告（僅 dev 模式主控台可見，不影響功能），根因在 Radix 元件內部，修復需要升級到 Radix v2 + React 19，评估後判定不符效益，已與使用者達成一致暫不處理。

## 驗證方式

1. 首次載入應自動彈出登入視窗（`status` 為 `signed-out`）
2. 註冊新帳號 → 登入成功／收到信箱驗證提示；身分列顯示使用者名稱與 Personal Best
3. 玩一局負分、一局正分 → 確認 `profiles.high_score` 只在新分數較高時更新
4. 登出 → 身分列還原、登入視窗重新彈出；再次登入 → Personal Best 顯示先前保存值
5. 「以訪客身分繼續」完整玩一局 → 確認資料庫沒有寫入
6. 建立第二帳號並取得更高分 → Leaderboard 前 3 名排序正確
7. `npx tsc --noEmit` 與 `npm run build` 皆需通過
