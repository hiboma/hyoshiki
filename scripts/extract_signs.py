"""
交通標識画像抽出スクリプト

国土交通省の道路標識一覧 PDF (ichiran.pdf) から個別の標識画像を切り出します。
Phase 1 プロトタイプで使用した処理を保存したものです。

処理の流れ:
  1. PyMuPDF で PDF を 4 倍解像度でレンダリングして PNG 化
  2. 手動で定義したセル座標 (PDF pt 単位) から各標識領域を切り出し
  3. 白背景 (RGB >= 240) を透過に変換
  4. OpenCV の連結成分解析で標識本体を特定し、周辺のゴミ (文字・罫線) を除去
  5. 標識本体の内部にある透過ピクセルを floodfill で判定し、白色に復元

依存ライブラリ:
  pip install pymupdf pillow opencv-python-headless numpy

使い方:
  python scripts/extract_signs.py
"""

import fitz
from PIL import Image
import numpy as np
import cv2
import json
import os


# --- 設定 ---

PDF_PATH = os.path.join(os.path.dirname(__file__), "..", "ichiran.pdf")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "signs")
JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "signs.json")

# PDF レンダリングの倍率
SCALE = 4

# 白背景と判定する RGB 閾値
WHITE_THRESHOLD = 240

# 各セルの上部テキスト領域の高さ (pt)。この分を切り出しから除外する
TEXT_OFFSET_PT = 14

# セル下端のマージン (pt)
BOTTOM_MARGIN_PT = 2

# 連結成分の最小面積 (全不透明ピクセルに対する割合)。これ未満はゴミとして除去する
MIN_COMPONENT_RATIO = 0.05


# --- 標識定義 ---
# (id, name, category, left_pt, right_pt, row_top_pt, row_bottom_pt)
# left/right: セルの左右端 (PDF pt)
# row_top/row_bottom: 水平罫線の Y 座標 (PDF pt)
#
# PDF の罫線位置 (下半分):
#   456.5, 514.7, 572.9, 631.1, 689.3, 747.6, 805.8
# 各行の高さは約 58.2pt。上部約 14pt がテキストラベル

SIGN_DEFINITIONS = [
    # 警戒標識 (下半分左側, x < 260)
    ("201-A", "十形道路交差点あり", "警戒標識", 44, 87, 456.5, 514.7),
    ("207", "踏切あり", "警戒標識", 44, 87, 572.9, 631.1),
    ("209", "すべりやすい", "警戒標識", 44, 87, 631.1, 689.3),
    ("215", "その他の危険", "警戒標識", 88, 130, 747.6, 805.8),

    # 規制標識 (下半分中央, 260 <= x < 850)
    ("301", "通行止め", "規制標識", 260, 308, 456.5, 514.7),
    ("303", "車両進入禁止", "規制標識", 358, 405, 456.5, 514.7),
    ("311-A", "指定方向外進行禁止", "規制標識", 505, 553, 456.5, 514.7),
    ("323", "最高速度", "規制標識", 456, 504, 572.9, 631.1),
    ("329", "徐行", "規制標識", 309, 357, 747.6, 805.8),
    ("330-A", "一時停止", "規制標識", 407, 455, 747.6, 805.8),

    # 指示標識 (下半分右側, 850 <= x < 985)
    ("401", "並進可", "指示標識", 851, 893, 456.5, 514.7),
    ("406", "横断歩道", "指示標識", 851, 893, 514.7, 572.9),
    ("407", "自転車横断帯", "指示標識", 893, 935, 514.7, 572.9),
    ("408", "安全地帯", "指示標識", 936, 979, 631.1, 689.3),

    # 補助標識 (下半分最右, x >= 985)
    ("501", "距離・区域", "補助標識", 985, 1028, 456.5, 514.7),
    ("502", "日・時間", "補助標識", 1053, 1096, 456.5, 514.7),
]


def clean_sign_image(img_pil):
    """
    標識画像のクリーニング処理。

    1. 白背景を透過にする
    2. 連結成分解析で画像中央の標識本体を特定し、ゴミを除去する
    3. 標識本体の内部にある透過ピクセルを白に復元する

    Args:
        img_pil: PIL Image (RGB)

    Returns:
        PIL Image (RGBA, 透過背景)
    """
    img_np = np.array(img_pil.convert("RGBA"))
    h, w = img_np.shape[:2]

    # Step 1: 白背景を透過にする
    white_mask = (
        (img_np[:, :, 0] >= WHITE_THRESHOLD) &
        (img_np[:, :, 1] >= WHITE_THRESHOLD) &
        (img_np[:, :, 2] >= WHITE_THRESHOLD)
    )
    img_np[white_mask, 3] = 0

    # Step 2: 連結成分解析で標識本体を特定する
    opaque = (img_np[:, :, 3] > 0).astype(np.uint8) * 255
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        opaque, connectivity=8
    )

    cx, cy = w / 2, h / 2
    total_opaque = np.sum(opaque > 0)

    # 中央に最も近い大きな連結成分を選ぶ
    best_label = -1
    best_score = float("inf")
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area < total_opaque * MIN_COMPONENT_RATIO:
            continue
        dist = ((centroids[i][0] - cx) ** 2 + (centroids[i][1] - cy) ** 2) ** 0.5
        score = dist / (area ** 0.5)
        if score < best_score:
            best_score = score
            best_label = i

    if best_label < 0:
        return Image.fromarray(img_np)

    # 中央成分の bbox 内にある他の成分も保持する
    bx = stats[best_label, cv2.CC_STAT_LEFT]
    by = stats[best_label, cv2.CC_STAT_TOP]
    bw = stats[best_label, cv2.CC_STAT_WIDTH]
    bh = stats[best_label, cv2.CC_STAT_HEIGHT]
    margin = 4
    keep_labels = set()
    for i in range(1, num_labels):
        icx, icy = centroids[i]
        if (bx - margin <= icx <= bx + bw + margin and
                by - margin <= icy <= by + bh + margin):
            keep_labels.add(i)

    # 保持対象以外のピクセルを透過にする
    for i in range(1, num_labels):
        if i not in keep_labels:
            img_np[labels == i, 3] = 0

    # Step 3: 内部の透過ピクセルを白に復元する
    # 保持した連結成分の合算 bbox を計算
    keep_mask = np.zeros((h, w), dtype=bool)
    for i in keep_labels:
        keep_mask |= (labels == i)

    ys, xs = np.where(keep_mask)
    if len(ys) == 0:
        return Image.fromarray(img_np)

    kx0, ky0 = xs.min(), ys.min()
    kx1, ky1 = xs.max(), ys.max()

    # bbox 内の透過ピクセルに対して、外周から floodfill して外側を判定する
    bbox_alpha = img_np[ky0:ky1 + 1, kx0:kx1 + 1, 3]
    is_transparent = (bbox_alpha == 0).astype(np.uint8) * 255

    fill_mask = np.zeros(
        (is_transparent.shape[0] + 2, is_transparent.shape[1] + 2),
        dtype=np.uint8,
    )

    # 上下左右の辺から floodfill して外側をマーク (値 128)
    for x in range(is_transparent.shape[1]):
        if is_transparent[0, x] == 255:
            cv2.floodFill(is_transparent, fill_mask, (x, 0), 128)
        if is_transparent[is_transparent.shape[0] - 1, x] == 255:
            cv2.floodFill(is_transparent, fill_mask, (x, is_transparent.shape[0] - 1), 128)
    for y in range(is_transparent.shape[0]):
        if is_transparent[y, 0] == 255:
            cv2.floodFill(is_transparent, fill_mask, (0, y), 128)
        if is_transparent[y, is_transparent.shape[1] - 1] == 255:
            cv2.floodFill(is_transparent, fill_mask, (is_transparent.shape[1] - 1, y), 128)

    # floodfill で到達されなかった透過ピクセル (値 255 のまま) が内部 → 白に復元
    interior_mask = (is_transparent == 255)
    sub = img_np[ky0:ky1 + 1, kx0:kx1 + 1]
    sub[interior_mask, 0] = 255
    sub[interior_mask, 1] = 255
    sub[interior_mask, 2] = 255
    sub[interior_mask, 3] = 255

    return Image.fromarray(img_np)


def main():
    # PDF を開いてレンダリング
    pdf_path = os.path.abspath(PDF_PATH)
    print(f"PDF: {pdf_path}")

    doc = fitz.open(pdf_path)
    page = doc[0]
    mat = fitz.Matrix(SCALE, SCALE)
    pix = page.get_pixmap(matrix=mat)

    tmp_path = "/tmp/kotsuh_full.png"
    pix.save(tmp_path)
    doc.close()

    full_img = Image.open(tmp_path)
    print(f"Rendered: {full_img.width}x{full_img.height}px (scale={SCALE})")

    # 出力ディレクトリの準備
    out_dir = os.path.abspath(OUTPUT_DIR)
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        if f.endswith(".png"):
            os.remove(os.path.join(out_dir, f))

    # 各標識を切り出して処理
    sign_data = []
    for sid, name, cat, l, r, row_top, row_bottom in SIGN_DEFINITIONS:
        x0 = int(l * SCALE)
        y0 = int((row_top + TEXT_OFFSET_PT) * SCALE)
        x1 = int(r * SCALE)
        y1 = int((row_bottom - BOTTOM_MARGIN_PT) * SCALE)

        cropped = full_img.crop((x0, y0, x1, y1))
        cleaned = clean_sign_image(cropped)

        fname = f"{sid}.png"
        cleaned.save(os.path.join(out_dir, fname))
        sign_data.append({
            "id": sid,
            "name": name,
            "category": cat,
            "image": f"data/signs/{fname}",
        })
        print(f"  {fname} ({cleaned.width}x{cleaned.height}) [{cat}] {name}")

    # JSON 出力
    json_path = os.path.abspath(JSON_PATH)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(sign_data, f, ensure_ascii=False, indent=2)

    print(f"\nDone: {len(sign_data)} signs -> {json_path}")


if __name__ == "__main__":
    main()
