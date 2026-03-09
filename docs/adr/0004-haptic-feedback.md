# ADR-0004: タップフィードバックとハプティクス

## ステータス

採用

## コンテキスト

子供向けアプリのため、タップした際に「反応した」ことが明確に伝わる必要があります。
iOS Safari は `navigator.vibrate()` (Vibration API) に対応していません。

## 決定

視覚フィードバック (CSS) と触覚フィードバック (ハプティクス) を組み合わせます。

### 視覚フィードバック

CSS の `:active` 擬似クラスと `transform: scale()` で実装します。

| 操作対象 | スケール |
|---|---|
| グリッドアイテム | 0.9 |
| カテゴリボタン | 0.92 |
| 前へ/次へボタン | 0.85 |
| カード (読み上げ) | 1.04 (パルスアニメーション) |

### 触覚フィードバック

プラットフォームに応じて異なる手法を使います。

| プラットフォーム | 手法 |
|---|---|
| iOS Safari | `<input type="checkbox" switch>` の click イベントによるハプティクス |
| Android | `navigator.vibrate(10)` |
| デスクトップ | なし (視覚フィードバックのみ) |

### iOS のハプティクス実装

不可視の `<input type="checkbox" switch>` 要素を作成し、
タップイベント時にプログラムで `.click()` を呼び出してネイティブのハプティクスを発動させます。

```javascript
const hapticEl = document.createElement("input");
hapticEl.type = "checkbox";
hapticEl.setAttribute("switch", "");
hapticEl.style.cssText = "position:fixed;opacity:0;pointer-events:none;top:-100px";
document.body.appendChild(hapticEl);

// タップ時
hapticEl.click();
```

## リスク

iOS のハプティクスは `<input type="checkbox" switch>` の非公式な挙動を利用しています。
Apple が `switch` 属性のハプティクス挙動を変更した場合、動作しなくなります。
その場合は視覚フィードバックのみにフォールバックします。

## 参考

- https://azukiazusa.dev/blog/ios-safari-web-haptics/
