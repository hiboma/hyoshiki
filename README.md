# hyoshiki

子供向け交通標識読み上げブラウザアプリです。

日本の交通標識をタップすると名前を読み上げます。Web Speech API を使用しており、インストール不要でブラウザから利用できます。

## デモ

https://hiboma.github.io/hyoshiki/

## 機能

- 交通標識 189 種類を収録しています
- 標識をタップすると名前を音声で読み上げます
- カテゴリ別フィルタリング（案内・警戒・規制・指示）に対応しています
- ふりがな表示に対応しています
- 音声の速度・高さを設定できます
- スワイプ操作でカードを切り替えられます

## 開発

```bash
# 依存パッケージのインストール
npm install

# Playwright ブラウザのインストール
npx playwright install --with-deps chromium

# テストの実行
npx playwright test
```

## 標識画像の出典

国土交通省「[道路標識一覧](https://www.mlit.go.jp/road/sign/sign/douro/ichiran.pdf)」より引用しています。

道路標識のデザインは「道路標識、区画線及び道路標示に関する命令」に規定されたものであり、著作権法の対象外です。

## ライセンス

MIT License
