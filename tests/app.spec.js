const { test, expect } = require("@playwright/test");

// ==================== フォント仕様 ====================
// フォントサイズの変更は承認が必要です。
// 変更する場合はテストの期待値も合わせて更新してください。

const FONT_SPECS = {
  // カードページ: 標識名
  signNameBlock: { fontSize: "28px", fontWeight: "700" },
  // カードページ: ふりがな (rt)
  signNameRt: { fontSize: "16px" },
  // カードページ: カテゴリラベル
  cardCategoryLabel: { fontSize: "16px", fontWeight: "600" },
  // カードページ: カウンター
  counter: { fontSize: "14px" },
  // グリッドページ: カテゴリボタン形状内テキスト
  catShapeText: { fontSize: "10px", fontWeight: "700" },
  // ヘッダー
  header: { fontSize: "15px" },
  // 戻るボタン
  backBtn: { fontSize: "15px", fontWeight: "600" },
};

test.describe("グリッドページ", () => {
  test("標識がグリッドに表示されます", async ({ page }) => {
    await page.goto("/");
    const items = page.locator(".grid-item");
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test("標識画像がコンテナからはみ出しません", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".grid-item .grid-sign-img");

    const overflows = await page.evaluate(() => {
      const items = document.querySelectorAll(".grid-item");
      const results = [];
      items.forEach((item, i) => {
        const img = item.querySelector(".grid-sign-img");
        const itemRect = item.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();
        if (
          imgRect.right > itemRect.right + 1 ||
          imgRect.bottom > itemRect.bottom + 1 ||
          imgRect.left < itemRect.left - 1 ||
          imgRect.top < itemRect.top - 1
        ) {
          results.push(i);
        }
      });
      return results;
    });
    expect(overflows).toEqual([]);
  });

  test("カテゴリボタンの形状内テキストのフォントが仕様通りです", async ({ page }) => {
    await page.goto("/");
    const span = page.locator("#grid-category-nav .cat-shape-annai > span");
    const fontSize = await span.evaluate((el) => getComputedStyle(el).fontSize);
    const fontWeight = await span.evaluate((el) => getComputedStyle(el).fontWeight);
    expect(fontSize).toBe(FONT_SPECS.catShapeText.fontSize);
    expect(fontWeight).toBe(FONT_SPECS.catShapeText.fontWeight);
  });

  test("カテゴリフィルタで表示が切り替わります", async ({ page }) => {
    await page.goto("/");
    const allCount = await page.locator(".grid-item").count();

    await page.locator("#grid-category-nav .category-btn[data-category='案内標識']").click();
    const filteredCount = await page.locator(".grid-item").count();

    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(allCount);
  });

  test("ぜんぶボタンで全標識に戻ります", async ({ page }) => {
    await page.goto("/");
    const allCount = await page.locator(".grid-item").count();

    await page.locator("#grid-category-nav .category-btn[data-category='警戒標識']").click();
    await page.locator("#grid-category-nav .category-btn[data-category='all']").click();
    const restoredCount = await page.locator(".grid-item").count();

    expect(restoredCount).toBe(allCount);
  });
});

test.describe("カードページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".grid-item").first().click();
    await expect(page.locator("#card-page")).toBeVisible();
  });

  test("標識名が表示されます", async ({ page }) => {
    const text = await page.locator("#sign-name-block").textContent();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test("標識名のフォントサイズが仕様通りです", async ({ page }) => {
    const block = page.locator("#sign-name-block");
    const fontSize = await block.evaluate((el) => getComputedStyle(el).fontSize);
    expect(fontSize).toBe(FONT_SPECS.signNameBlock.fontSize);
  });

  test("標識名のフォントウェイトが仕様通りです", async ({ page }) => {
    const block = page.locator("#sign-name-block");
    const fontWeight = await block.evaluate((el) => getComputedStyle(el).fontWeight);
    expect(fontWeight).toBe(FONT_SPECS.signNameBlock.fontWeight);
  });

  test("ふりがなのフォントサイズが仕様通りです", async ({ page }) => {
    const rt = page.locator("#sign-name-block rt").first();
    const fontSize = await rt.evaluate((el) => getComputedStyle(el).fontSize);
    expect(fontSize).toBe(FONT_SPECS.signNameRt.fontSize);
  });

  test("カテゴリラベルが表示されます", async ({ page }) => {
    const label = page.locator("#card-category-label");
    const text = await label.textContent();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test("カテゴリラベルのフォントサイズが仕様通りです", async ({ page }) => {
    const label = page.locator("#card-category-label");
    const fontSize = await label.evaluate((el) => getComputedStyle(el).fontSize);
    expect(fontSize).toBe(FONT_SPECS.cardCategoryLabel.fontSize);
  });

  test("カウンターのフォントサイズが仕様通りです", async ({ page }) => {
    const counter = page.locator("#counter");
    const fontSize = await counter.evaluate((el) => getComputedStyle(el).fontSize);
    expect(fontSize).toBe(FONT_SPECS.counter.fontSize);
  });

  test("標識名がコンテナからはみ出しません", async ({ page }) => {
    const overflow = await page.evaluate(() => {
      const block = document.getElementById("sign-name-block");
      const card = document.getElementById("card");
      const blockRect = block.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      return blockRect.right > cardRect.right + 1 || blockRect.left < cardRect.left - 1;
    });
    expect(overflow).toBe(false);
  });

  test("長い標識名が「・」で改行されます", async ({ page }) => {
    // 「・」を含む標識に移動する
    const found = await page.evaluate(() => {
      const signs = window.__testSigns;
      if (!signs) return false;
      return signs.some((s) => s.name.includes("・"));
    });

    // signs が window に公開されていない場合は JSON から直接確認する
    const response = await page.evaluate(() => fetch("data/signs.json").then((r) => r.json()));
    const longSign = response.find((s) => s.name.includes("・"));
    expect(longSign).toBeTruthy();

    // 長い標識名の「・」を含む標識を表示する
    const index = response.indexOf(longSign);
    await page.locator("#back-btn").click();
    await page.locator(".grid-item").nth(index).click();

    const brCount = await page.locator("#sign-name-block br").count();
    expect(brCount).toBeGreaterThan(0);
  });

  test("前へ/次へボタンで標識が切り替わります", async ({ page }) => {
    const text1 = await page.locator("#counter").textContent();
    await page.locator("#next-btn").click();
    await page.waitForTimeout(300);
    const text2 = await page.locator("#counter").textContent();
    expect(text1).not.toBe(text2);
  });

  test("もどるボタンでグリッドに戻ります", async ({ page }) => {
    await page.locator("#back-btn").click();
    await expect(page.locator("#grid-page")).toBeVisible();
    await expect(page.locator("#card-page")).toBeHidden();
  });

  test("戻るボタンのフォントが仕様通りです", async ({ page }) => {
    const btn = page.locator("#back-btn");
    const fontSize = await btn.evaluate((el) => getComputedStyle(el).fontSize);
    const fontWeight = await btn.evaluate((el) => getComputedStyle(el).fontWeight);
    expect(fontSize).toBe(FONT_SPECS.backBtn.fontSize);
    expect(fontWeight).toBe(FONT_SPECS.backBtn.fontWeight);
  });
});

test.describe("iPad レイアウト", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("グリッドが5列で表示されます", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".grid-item");
    const columns = await page.evaluate(() => {
      const grid = document.getElementById("grid");
      return getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    });
    expect(columns).toBe(5);
  });

  test("カテゴリナビが中央揃えです", async ({ page }) => {
    await page.goto("/");
    const justifyContent = await page.evaluate(() => {
      const nav = document.querySelector(".category-nav");
      return getComputedStyle(nav).justifyContent;
    });
    expect(justifyContent).toBe("center");
  });

  test("フォントサイズが iPad 仕様通りです", async ({ page }) => {
    await page.goto("/");
    await page.locator(".grid-item").first().click();
    await expect(page.locator("#card-page")).toBeVisible();

    const signFontSize = await page.locator("#sign-name-block").evaluate((el) => getComputedStyle(el).fontSize);
    expect(signFontSize).toBe("34px");

    const rtFontSize = await page.locator("#sign-name-block rt").first().evaluate((el) => getComputedStyle(el).fontSize);
    expect(rtFontSize).toBe("18px");
  });
});

test.describe("iPad Pro レイアウト", () => {
  test.use({ viewport: { width: 1024, height: 1366 } });

  test("グリッドが6列で表示されます", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".grid-item");
    const columns = await page.evaluate(() => {
      const grid = document.getElementById("grid");
      return getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    });
    expect(columns).toBe(6);
  });

  test("フォントサイズが iPad Pro 仕様通りです", async ({ page }) => {
    await page.goto("/");
    await page.locator(".grid-item").first().click();
    await expect(page.locator("#card-page")).toBeVisible();

    const signFontSize = await page.locator("#sign-name-block").evaluate((el) => getComputedStyle(el).fontSize);
    expect(signFontSize).toBe("38px");

    const rtFontSize = await page.locator("#sign-name-block rt").first().evaluate((el) => getComputedStyle(el).fontSize);
    expect(rtFontSize).toBe("20px");
  });
});

test.describe("カテゴリ連携", () => {
  test("グリッドでフィルタした状態でカードに入るとフィルタが維持されます", async ({ page }) => {
    await page.goto("/");

    await page.locator("#grid-category-nav .category-btn[data-category='警戒標識']").click();
    const filteredCount = await page.locator(".grid-item").count();

    await page.locator(".grid-item").first().click();
    await expect(page.locator("#card-page")).toBeVisible();

    const counterText = await page.locator("#counter").textContent();
    const total = parseInt(counterText.split("/")[1].trim());
    expect(total).toBe(filteredCount);
  });
});
