import { expect, test } from "@playwright/test";

test("all main pages load and have the right title", async ({ page }) => {
  type TestCase = {
    url: string;
    expectation: {
      title: string;
    };
  };
  // given
  const testCases: TestCase[] = [
    { url: "", expectation: { title: "Pipelines | Brespi" } },
    { url: "schedules", expectation: { title: "Schedules | Brespi" } },
    { url: "configuration", expectation: { title: "Configuration | Brespi" } },
  ];
  for (const { url, expectation } of testCases) {
    // when
    await page.goto(url);
    // then
    await expect(page).toHaveTitle(expectation.title);
  }
});
