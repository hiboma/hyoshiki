# ADR-0008: CSS スプライトシートによるグリッド表示の高速化

## ステータス

採用

## コンテキスト

グリッドページで 189 枚の標識画像を個別の `<img>` タグで読み込んでいました。
LAN 環境では遅延は発生しませんが、低速なモバイル回線では 189 件の HTTP リクエストがボトルネックになります。

## 決定

### スプライトシートで HTTP リクエストを 1 件に削減します

189 枚の PNG 画像を 1 枚のスプライトシート (WebP) にまとめます。
グリッドページでは `<img>` タグの代わりに `<div>` の `background-image` + `background-position` で表示します。

### スプライトの仕様

| 項目 | 値 |
|---|---|
| セルサイズ | 160x160px |
| 配置 | 15列 x 15行 (225セル、189画像 + 36空セル) |
| スプライト全体 | 2400x2400px (正方形) |
| フォーマット | WebP (約 980KB) |

正方形にした理由: `background-size` の幅と高さの倍率を統一し、iOS Safari での表示崩れを防ぐためです。

### 座標マッピング

`data/sprite-map.json` にセル座標を格納します。

```json
{
  "cellWidth": 160,
  "cellHeight": 160,
  "columns": 15,
  "rows": 15,
  "signs": {
    "101": { "col": 0, "row": 0 },
    "102-A": { "col": 1, "row": 0 }
  }
}
```

### グリッドの描画方式

`buildGrid()` で `<div class="grid-sign-img">` を生成し、DOM 描画後に `requestAnimationFrame` でコンテナの実サイズを取得して `background-size` と `background-position` をピクセルで設定します。

パーセンテージ指定ではなくピクセル指定にした理由: CSS の `background-position` のパーセンテージは `(container_size - bg_size) * percentage` で計算されるため、iOS Safari と macOS Chrome で解釈差が生じました。ピクセル指定で統一することで解消しています。

### カードページは変更しません

カードページは 1 枚ずつ表示するため、個別 PNG の `<img>` タグをそのまま維持します。

### 生成スクリプト

`scripts/generate_sprite.sh` で ImageMagick (montage) と cwebp を使ってスプライトシートと座標マッピングを生成します。画像を追加・変更した場合はこのスクリプトを再実行します。

## 影響

- `data/sprite.webp` と `data/sprite-map.json` が追加されます
- `app.js` の `buildGrid()` が `<img>` から `<div>` + `background-position` 方式に変更されます
- `style.css` の `.grid-item` が `display: flex` から `position: relative` に変更されます
- `tests/app.spec.js` のセレクタが `.grid-item img` から `.grid-item .grid-sign-img` に変更されます
- グリッドページの HTTP リクエストが 189 件から 1 件に削減されます

## 代替案として検討したもの

- **個別画像の WebP 変換のみ**: リクエスト数は削減されません
- **Base64 データ URI の埋め込み**: signs.json が肥大化します
- **Service Worker によるキャッシュ**: 初回読み込みは改善されません
