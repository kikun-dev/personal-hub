import { expect, test, type Locator } from "@playwright/test";
import {
  composite,
  expectAaContrast,
  expectAaContrastColors,
  expectContrastAtLeast,
  expectRenderedTextContrast,
  focusWithKeyboard,
  parseColor,
  themes,
  viewports,
} from "./contrast";

for (const theme of themes) {
  for (const viewport of viewports) {
    test(`${theme} ${viewport.width}pxでsemantic UI stateを維持する`, async ({
      page,
      browserName,
    }) => {
      test.setTimeout(60_000);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme });

      await page.goto("/");
      // #399: タイトル階層の反転（eyebrow=非heading、h1=日付）を契約として固定する。
      // #404レビュー対応: level:1の存在 + テキスト存在だけでは旧実装
      // （<h1>今日のSakalog</h1>）でもpassしてしまうため、h1のaccessible nameが
      // 日付形式であること、「今日のSakalog」がheadingではなくeyebrow（p要素）で
      // あることまで検証する。
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        /^\d{1,2}月\d{1,2}日\([日月火水木金土]\)$/
      );
      await expect(
        page.getByRole("heading", { name: "今日のSakalog" })
      ).toHaveCount(0);
      await expect(
        page.locator("p").filter({ hasText: "今日のSakalog" })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "日付から探す" })
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Sakalog" })).toHaveAttribute(
        "aria-current",
        "page"
      );

      await page.goto("/lives");
      await expect(page.getByRole("heading", { name: "ライブ" })).toBeVisible();

      let currentLink: Locator;
      if (viewport.width < 768) {
        await page.getByRole("button", { name: "メニューを開く" }).click();
        currentLink = page
          .getByRole("dialog")
          .getByRole("link", { name: "ライブ", exact: true });
      } else {
        currentLink = page
          .locator("header nav")
          .first()
          .getByRole("link", { name: "ライブ", exact: true });
      }
      await expect(currentLink).toBeVisible();
      await expect(currentLink).toHaveAttribute("aria-current", "page");

      const currentStyles = await currentLink.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          fontWeight: Number(style.fontWeight),
        };
      });
      const bodyBackground = await page
        .locator("body")
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(currentStyles.backgroundColor).not.toBe(bodyBackground);
      expect(currentStyles.fontWeight).toBeGreaterThanOrEqual(500);

      await focusWithKeyboard(page, currentLink);
      const focusStyles = await currentLink.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          outlineColor: style.outlineColor,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
        };
      });
      expect(focusStyles.outlineWidth).toBe("2px");
      expect(focusStyles.outlineStyle).not.toBe("none");
      expectAaContrast(
        focusStyles.outlineColor,
        currentStyles.backgroundColor,
        "focus indicator"
      );

      if (viewport.width < 768) {
        await page.getByRole("button", { name: "メニューを閉じる" }).click();
      }

      const primaryText = page.getByRole("heading", { name: "ライブ" });
      const secondaryText = page
        .locator("header .text-foreground-secondary:visible")
        .first();
      const badge = page.locator('[data-ui="badge"]:visible').first();
      await expect(secondaryText).toBeVisible();
      await expect(badge).toBeVisible();

      const [primaryColor, secondaryColor, badgeStyles, semanticTokens] =
        await Promise.all([
          primaryText.evaluate((element) => getComputedStyle(element).color),
          secondaryText.evaluate((element) => getComputedStyle(element).color),
          badge.evaluate((element) => {
            const style = getComputedStyle(element);
            return {
              color: style.color,
              backgroundColor: style.backgroundColor,
            };
          }),
          page.evaluate(() => {
            const style = getComputedStyle(document.documentElement);
            return {
              danger: style.getPropertyValue("--danger"),
              dangerForeground:
                style.getPropertyValue("--danger-foreground"),
            };
          }),
        ]);

      expectAaContrast(primaryColor, bodyBackground, "primary text");
      expectAaContrast(secondaryColor, bodyBackground, "secondary text");
      const badgeBackground = composite(
        parseColor(badgeStyles.backgroundColor),
        parseColor(bodyBackground)
      );
      expectAaContrastColors(
        composite(parseColor(badgeStyles.color), badgeBackground),
        badgeBackground,
        "badge"
      );
      expectAaContrast(
        semanticTokens.dangerForeground,
        semanticTokens.danger,
        "danger pair"
      );

      await test.step("Chromium accessible tree spot check", async (step) => {
        step.skip(
          browserName !== "chromium" || viewport.width < 768,
          "Chromiumのaccessible tree確認はdesktop viewportで実施します。"
        );
        const snapshot = await page.locator("header").ariaSnapshot();
        expect(snapshot).toContain("navigation");
        expect(snapshot).toContain("ライブ");
      });
    });
  }
}

// #399 / #404レビュー対応: 選んだ日分岐にも今日分岐と同じタイトル階層契約を固定する
// （eyebrow「選んだ日のSakalog」= 非heading、h1 = 年付き日付）。日付は固定し、
// 曜日はformatMonthDayKanjiWithWeekdayと同じ規則でテスト内算出する。
test("選んだ日分岐でもeyebrow + h1=日付のタイトル階層を維持する", async ({
  page,
}) => {
  await page.goto("/?year=2026&month=7&day=16");
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][
    new Date("2026-07-16T00:00:00").getDay()
  ];
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `2026年7月16日(${weekday})`
  );
  await expect(
    page.getByRole("heading", { name: "選んだ日のSakalog" })
  ).toHaveCount(0);
  await expect(
    page.locator("p").filter({ hasText: "選んだ日のSakalog" })
  ).toBeVisible();
});

for (const theme of themes) {
  test(`${theme}でライブ本文とSecondary Buttonのrendered contrastを維持する`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/lives");
    await expect(page.getByRole("heading", { name: "ライブ" })).toBeVisible();

    const bodyBackground = await page
      .locator("body")
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    await expectRenderedTextContrast(
      page.locator('[data-ui="live-count"]'),
      bodyBackground,
      "live count"
    );
    await expectRenderedTextContrast(
      page.locator('[data-ui="live-type"]'),
      bodyBackground,
      "live type"
    );
    await expectRenderedTextContrast(
      page.locator('[data-ui="live-date"]'),
      bodyBackground,
      "live date"
    );

    const singleVenueLiveCard = page.getByRole("link", {
      name: /ひなたフェス2026/,
    });
    await expect(singleVenueLiveCard).toBeVisible();
    const liveHref = await singleVenueLiveCard.getAttribute("href");
    if (liveHref === null) {
      throw new Error(
        "単一会場リンク検証用のひなたフェス2026 URLを取得できませんでした。"
      );
    }

    await page.goto("/lives?groupId=__contrast-test-empty__");
    const emptyState = page.locator('[data-ui="live-empty"]');
    await expect(emptyState).toBeVisible();
    await expectRenderedTextContrast(emptyState, bodyBackground, "live empty state");

    await page.goto(liveHref);
    const singleVenueLink = page.locator('[data-ui="single-venue-link"]');
    await expect(singleVenueLink).toBeVisible();
    await focusWithKeyboard(page, singleVenueLink);
    const venueFocusStyles = await singleVenueLink.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineColor: style.outlineColor,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });
    expect(venueFocusStyles.outlineWidth).toBe("2px");
    expect(venueFocusStyles.outlineStyle).not.toBe("none");
    expectAaContrast(
      venueFocusStyles.outlineColor,
      bodyBackground,
      "single venue link focus indicator"
    );

    // #363/#375: fallback cardのAttendanceControlはconditional mountになり、secondary button
    // （参戦を記録/編集）は展開するまで存在しない。disclosureで展開してから検証する。
    // 未登録cardは展開と同時にformが直接開く（保存=primary/キャンセル=ghost）ため、
    // キャンセルで非編集状態（「参戦を記録」= secondary）へ戻してから対象を取る
    const attendanceDisclosure = page
      .getByTestId("live-performance-carousel")
      .locator("button[aria-controls]")
      .first();
    await attendanceDisclosure.click();
    await expect(
      page.getByRole("button", { name: /^(編集|キャンセル)$/ }).first()
    ).toBeVisible();
    const cancelButton = page.getByRole("button", { name: "キャンセル" });
    if ((await cancelButton.count()) > 0) {
      await cancelButton.click();
    }

    const secondaryButton = page
      .locator('[data-ui="button"][data-variant="secondary"]')
      .first();
    await expect(secondaryButton).toBeVisible();
    const buttonStyles = await secondaryButton.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderTopColor,
      };
    });
    expectContrastAtLeast(
      parseColor(buttonStyles.borderColor),
      parseColor(buttonStyles.backgroundColor),
      3,
      "secondary button border"
    );
  });
}
