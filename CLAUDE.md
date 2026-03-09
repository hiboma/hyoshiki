# CLAUDE.md

## テスト

- `npx playwright test` で UI テストを実行します。
- コードを変更した後は必ずテストを実行し、リグレッションがないことを確認してください。

## フォント仕様

フォントサイズ・フォントウェイトの変更は**ユーザーの承認が必要**です。
変更する場合は以下の手順に従ってください。

1. 変更内容をユーザーに提示し、承認を得ます。
2. CSS を変更します。
3. `tests/app.spec.js` の `FONT_SPECS` の期待値を更新します。
4. テストを実行して全てパスすることを確認します。

現在のフォント仕様は `tests/app.spec.js` の `FONT_SPECS` に定義されています。
iPad 向けのフォントサイズは `style.css` の media query (`min-width: 768px`, `min-width: 1024px`) で定義されており、テストは `tests/app.spec.js` の「iPad レイアウト」「iPad Pro レイアウト」で検証しています。
