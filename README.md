# 今天在隱花王國尋寶

網址：https://hidden-fig-kingdom.vercel.app（測試版 `/test.html`）

## 檔案一覽

```
index.html            正式版遊戲（連 Firebase，玩家資料在雲端）
test.html             測試版（示範模式，資料只存手機；新功能先上這裡）
api/game.js           後端：免單、半價、折200、特別獎的抽獎與發券
package.json          後端需要的套件（firebase-admin）
theme.mp3             背景音樂

art/                  所有圖檔（只換圖不用改程式）
  map/kingdom-bg.webp        王國地圖：天空之城插畫
  map/kingdom-sky-mask.png   地圖遮罩：晚上只讓天空變暗
  chars/<角色>.webp          16 位 3D 角色（awu、alien、robot、hero、apo、knight、cat、teddy、
                             dog、kiki、turtle、hen、poodle、golden、shiba、bunny）
  gh/fig-<階段>.webp         溫室裡的樹：prune 剪枝、set 座果、ripe 採收（度冬由程式畫枯枝）
                             （可加 -2、-3 變化圖，自動輪流）

firestore.rules       目前已發布的 Firestore 規則（存檔，改規則從這份接著改）
docs/                 交接說明與參考圖（不會部署到網站）
.vercelignore         不部署的檔案：firestore.rules、docs/
```

## 規則

- **金鑰**只放在 Vercel 環境變數 `FIREBASE_SERVICE_ACCOUNT`，絕不放進這個公開的 repo。
- 新功能先改 `test.html` 測試，確認後才同步到 `index.html`。
- 兩個 html 的差別只有 Firebase 設定與 `TEST_TOOLS`。
- 不能影響既有玩家資料。舊欄位（例如角色的 `mat`、`color`）保留不刪。
- 友軍（其他協作者）只交圖檔到 `art/`，不碰程式與後台；說明在 `docs/`。

## 角色名稱

阿無、吃貨外星人、苔蘚古機器人、英雄（hero）、ㄚ波（apo）、黑騎士、小呱、碰氣、
黑熊、奇奇、小葵、一虎、小雪、golden、柴柴、邦尼
