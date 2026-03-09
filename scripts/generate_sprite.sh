#!/bin/bash
# スプライトシート生成スクリプト
# 依存: ImageMagick (montage), cwebp, jq

set -euo pipefail

PROJ_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SIGNS_JSON="$PROJ_DIR/data/signs.json"
SIGNS_DIR="$PROJ_DIR/data/signs"
OUT_DIR="$PROJ_DIR/data"

CELL_W=160
CELL_H=160
COLUMNS=15

# signs.json から ID 順にファイルリストを取得する
FILE_LIST=$(jq -r '.[].image' "$SIGNS_JSON" | sed "s|^|$PROJ_DIR/|")
TOTAL=$(echo "$FILE_LIST" | wc -l | tr -d ' ')
ROWS=$COLUMNS  # 正方形スプライトにする (background-size の計算を統一するため)

echo "画像数: $TOTAL, 配置: ${COLUMNS}列 x ${ROWS}行, セル: ${CELL_W}x${CELL_H}px"

SPRITE_W=$((COLUMNS * CELL_W))
SPRITE_H=$((ROWS * CELL_H))

# スプライトシート生成
montage $FILE_LIST \
  -tile "${COLUMNS}x" \
  -geometry "${CELL_W}x${CELL_H}+0+0" \
  -gravity center \
  -background transparent \
  "$OUT_DIR/sprite.png"

# 正方形にリサイズする (末尾行を透明余白で埋める)
magick "$OUT_DIR/sprite.png" \
  -gravity NorthWest \
  -background transparent \
  -extent "${SPRITE_W}x${SPRITE_H}" \
  "$OUT_DIR/sprite.png"

echo "sprite.png 生成完了: $(du -h "$OUT_DIR/sprite.png" | cut -f1) (${SPRITE_W}x${SPRITE_H}px)"

# WebP 変換
cwebp -q 90 "$OUT_DIR/sprite.png" -o "$OUT_DIR/sprite.webp" 2>/dev/null
echo "sprite.webp 生成完了: $(du -h "$OUT_DIR/sprite.webp" | cut -f1)"

# 座標マッピング JSON を生成する
IDS=$(jq -r '.[].id' "$SIGNS_JSON")
echo "{" > "$OUT_DIR/sprite-map.json"
echo "  \"cellWidth\": $CELL_W," >> "$OUT_DIR/sprite-map.json"
echo "  \"cellHeight\": $CELL_H," >> "$OUT_DIR/sprite-map.json"
echo "  \"columns\": $COLUMNS," >> "$OUT_DIR/sprite-map.json"
echo "  \"rows\": $ROWS," >> "$OUT_DIR/sprite-map.json"
echo "  \"signs\": {" >> "$OUT_DIR/sprite-map.json"

INDEX=0
LAST_INDEX=$((TOTAL - 1))
while IFS= read -r ID; do
  COL=$((INDEX % COLUMNS))
  ROW=$((INDEX / COLUMNS))
  COMMA=","
  if [ "$INDEX" -eq "$LAST_INDEX" ]; then
    COMMA=""
  fi
  echo "    \"$ID\": { \"col\": $COL, \"row\": $ROW }$COMMA" >> "$OUT_DIR/sprite-map.json"
  INDEX=$((INDEX + 1))
done <<< "$IDS"

echo "  }" >> "$OUT_DIR/sprite-map.json"
echo "}" >> "$OUT_DIR/sprite-map.json"

echo "sprite-map.json 生成完了 ($TOTAL エントリ)"
