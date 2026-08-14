# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用指令

```bash
npm install      # 安裝相依套件
npm run dev      # 啟動 Vite 開發伺服器，網址為 http://localhost:3000（會自動開啟瀏覽器）
npm run build    # 建置正式版本到 ./build
```

目前 `package.json` 尚未設定測試指令、lint 指令或型別檢查指令。

## 架構說明

這是一個小型的 React + TypeScript + Vite 單頁應用程式，實作「從三個寶箱中選一個」的小遊戲。幾乎所有遊戲邏輯與畫面都集中在同一個檔案：

- [src/App.tsx](src/App.tsx) — 整個遊戲的核心：`Box` 狀態（id / isOpen / hasTreasure）、分數計算、勝負結束狀態，以及畫面的 JSX 排版。`initializeGame` 會在元件掛載時與重置遊戲時，隨機把寶藏指派給三個寶箱其中之一；`openBox` 負責打開寶箱、依結果調整分數（找到寶藏 +100，開到骷髏 -50），並在找到寶藏或所有寶箱都被打開後結束遊戲。
- [src/main.tsx](src/main.tsx) — 標準的 React root 掛載邏輯，會載入 `src/index.css`。
- [src/assets/](src/assets) — 寶箱美術素材（關閉／開啟／開啟後為骷髏三種狀態）與鑰匙圖示。
- [src/audios/](src/audios) — 開箱音效（一般版本與「邪惡笑聲」版本），由 `App.tsx` 引用播放。
- [src/components/ui/](src/components/ui) — 由 shadcn/ui 產生的元件庫（基於 Radix UI 原生元件與 Tailwind）。請將這些檔案視為產生／vendored 的程式碼：除非有明確需求要修改，否則應優先以組合方式使用它們，而非改寫其內部實作。
- [src/components/figma/ImageWithFallback.tsx](src/components/figma/ImageWithFallback.tsx) — 由 Figma Make 產生的圖片元件，同樣視為產生／vendored 的程式碼。
- [src/styles/globals.css](src/styles/globals.css) 與 [src/index.css](src/index.css) — 基於 Tailwind 的全域樣式與設計 tokens。

### 模組解析的特殊之處

[vite.config.ts](vite.config.ts) 中定義了明確的 `resolve.alias` 設定，將帶版本號的 import 路徑（例如 `radix-ui/react-dialog@1.1.6`）對應到未帶版本號的套件名稱，另外也設定了 `'@'` → `./src`。這個專案原本是從 Figma Make／shadcn 匯出而來，因此 `src/components/ui` 下產生的元件可能仍保留帶版本號的 import 寫法（例如 `import * as DialogPrimitive from "@radix-ui/react-dialog@1.1.6"`），這些寫法只有靠上述 alias 設定才能正確解析。若新增了某個相依套件，而產生的程式碼是以帶版本號的方式 import 它，應該新增對應的 alias 項目，而不是逐一移除每個 import 位置的版本號。

### 樣式規範

`App.tsx` 中直接大量使用 Tailwind 的 utility class（沒有使用 CSS modules）。整體配色採用琥珀色系（`amber-*`），呼應尋寶主題。動畫效果使用 `motion` 套件（`motion/react`，即改名後的 framer-motion），主要用在寶箱翻轉動畫（`rotateY`）以及點擊時的 hover／tap 縮放效果。
