import { test, expect, Page } from "@playwright/test";

import { CREDENTIALS } from "./fixtures/user";

test.describe("인증 및 로그인 테스트 - 성공 시나리오", () => {
  // 항상 로그아웃 상태에서 시작
  test.beforeEach(async ({ context, page }) => {
    await page.goto("/");
    await context.clearCookies();
    await context.clearPermissions();
  });

  async function assertLoggedInToMyPage(page: Page, userName: string) {
    // URL 검증
    await expect(page).toHaveURL(/\/personal\/mypage$/);

    // 실명 요소 선택자 (마이페이지 헤더의 이름 영역)
    const nameEl = page.locator(
      "section.Mypage_mypage-info__eyAvx .mypage-info__user-name > span"
    );

    await expect(nameEl).toBeVisible();

    // '이름 + 님' 형태를 정규식으로 검증
    // 공백/개행이 끼어도 통과하도록 \s* 허용
    const expected = new RegExp(`^\\s*${userName}\\s*님\\s*$`);
    await expect(nameEl).toHaveText(expected);
  }

  test("올바른 아이디/비밀번호로 로그인 시 마이페이지로 이동해야 함", async ({
    page,
  }) => {
    await test.step("바텀 내비게이션의 마이페이지 메뉴 클릭해 로그인 페이지로 이동", async () => {
      await page.getByRole("link", { name: "마이페이지" }).click();
      await expect(page).toHaveURL(/\/user-account\/login(\?.*)?$/);
    });

    await test.step("아이디/비밀번호 입력", async () => {
      await page.getByPlaceholder("아이디").fill(CREDENTIALS.id);
      await page.getByPlaceholder("비밀번호").fill(CREDENTIALS.pw);
    });

    await test.step("로그인 제출", async () => {
      await page.getByRole("button", { name: /^로그인$/, exact: true }).click();
    });

    await test.step("마이페이지 이동 및 사용자명 표시 검증", async () => {
      await assertLoggedInToMyPage(page, CREDENTIALS.userName);
    });
  });

  test("앞뒤 공백이 포함된 입력값은 트리밍되어 정상 로그인되어야 함", async ({
    page,
  }) => {
    await test.step("바텀 내비게이션의 마이페이지 메뉴 클릭해 로그인 페이지로 이동", async () => {
      await page.getByRole("link", { name: "마이페이지" }).click();
      await expect(page).toHaveURL(/\/user-account\/login(\?.*)?$/);
    });

    await test.step("공백 포함 아이디, 비밀번호 입력", async () => {
      await page.getByPlaceholder("아이디").fill(`  ${CREDENTIALS.id}  `);
      await page.getByPlaceholder("비밀번호").fill(`  ${CREDENTIALS.pw}  `);
    });

    await test.step("로그인 제출", async () => {
      await page.getByRole("button", { name: /^로그인$/, exact: true }).click();
    });

    await test.step("마이페이지 이동 및 사용자명 표시 검증", async () => {
      await assertLoggedInToMyPage(page, CREDENTIALS.userName);
    });
  });

  test("미인증 상태에서 /personal/mypage 접근 시 로그인 후 원래 페이지로 복귀해야 함", async ({
    page,
  }) => {
    await test.step("보호 페이지 직접 접근 → 로그인 페이지로 리다이렉트 확인", async () => {
      await page.goto("/personal/mypage");
      const url = page.url();
      console.log(url);
      expect(url).toContain("/user-account/login");
    });

    await test.step("아이디, 비밀번호 입력 후 로그인", async () => {
      await page.getByPlaceholder("아이디").fill(CREDENTIALS.id);
      await page.getByPlaceholder("비밀번호").fill(CREDENTIALS.pw);
      await page.getByRole("button", { name: /^로그인$/, exact: true }).click();
    });

    await test.step("원래 목표 페이지로 복귀 검증", async () => {
      await assertLoggedInToMyPage(page, CREDENTIALS.userName);
    });
  });

  test("비밀번호 입력창에서 엔터(완료 키)로 제출 시 정상 로그인되어야 함", async ({
    page,
  }) => {
    await test.step("바텀 내비게이션의 마이페이지 메뉴 클릭해 로그인 페이지로 이동", async () => {
      await page.getByRole("link", { name: "마이페이지" }).click();
      await expect(page).toHaveURL(/\/user-account\/login(\?.*)?$/);
    });

    await test.step("아이디, 비밀번호 입력", async () => {
      await page.getByPlaceholder("아이디").fill(CREDENTIALS.id);
      await page.getByPlaceholder("비밀번호").fill(CREDENTIALS.pw);
    });

    await test.step("엔터(완료) 키로 제출", async () => {
      await page.getByPlaceholder("비밀번호").press("Enter");
    });

    await test.step("마이페이지 이동 및 사용자명 표시 검증", async () => {
      await assertLoggedInToMyPage(page, CREDENTIALS.userName);
    });
  });
});

const loginBtn = (page: Page) =>
  page.getByRole("button", { name: /^로그인$/, exact: true });

test.describe("인증 및 로그인 테스트 - 실패 시나리오", () => {
  test.beforeEach(async ({ page, context }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "마이페이지" }).click();
    await expect(page).toHaveURL(/\/user-account\/login(\?.*)?$/);

    await context.clearCookies();
    await context.clearPermissions();
  });

  test("존재하지 않는 계정시 alert 노출 됨", async ({ page }) => {
    await test.step("입력", async () => {
      await page.getByPlaceholder("아이디").fill("no_user");
      await page.getByPlaceholder("비밀번호").fill("Any123!");
    });

    await test.step("로그인 시도 후 alert 확인", async () => {
      const [dlg] = await Promise.all([
        page.waitForEvent("dialog"),
        loginBtn(page).click(),
      ]);
      await expect(dlg.message()).toContain(
        "아이디 또는 비밀번호가 일치하지 않습니다. 입력 내용을 다시 확인해 주세요."
      );
      await dlg.accept();
    });
  });

  test("비밀번호 불일치시 alert이 노출 됨", async ({ page }) => {
    await test.step("입력", async () => {
      await page.getByPlaceholder("아이디").fill(CREDENTIALS.id);
      await page.getByPlaceholder("비밀번호").fill("Wrong999");
    });

    await test.step("로그인 시도 후 alert 확인", async () => {
      const [dlg] = await Promise.all([
        page.waitForEvent("dialog"),
        loginBtn(page).click(),
      ]);
      await expect(dlg.message()).toContain(
        "아이디 또는 비밀번호가 일치하지 않습니다. 입력 내용을 다시 확인해 주세요."
      );
      await dlg.accept();
    });
  });

  test("아이디 공란시 alert이 노출 되고 아이디 포커스가 됨", async ({
    page,
  }) => {
    const loginApiPattern = "**/member/login*";
    let loginApiCalled = false;
    await page.route(loginApiPattern, async (route) => {
      loginApiCalled = true;
      await route.abort();
    });

    await test.step("비밀번호만 입력", async () => {
      await page.getByPlaceholder("비밀번호").fill(CREDENTIALS.pw);
      await expect(page.getByPlaceholder("아이디")).toHaveValue("");
      await expect(loginBtn(page)).toBeEnabled();
    });

    await test.step("로그인 시도 후 alert 확인", async () => {
      const whenDialog = page
        .waitForEvent("dialog", { timeout: 5000 })
        .then(async (d) => {
          await expect(d.message()).toContain("아이디를 입력해 주세요"); // 실제 문구
          await d.accept();
        });

      await loginBtn(page).click();
      await whenDialog; // dialog 검증/처리가 실제로 수행됐는지 보장
    });

    await test.step("API 요청이 발생하지 않음", async () => {
      expect(loginApiCalled).toBe(false);
    });

    await test.step("페이지/포커스 유지", async () => {
      await expect(page).toHaveURL(/\/user-account\/login(?:\?.*)?$/);
      await expect(page.getByPlaceholder("아이디")).toBeFocused();
    });
  });

  test("비밀번호 공란시 alert이 노출되고 비밀번호 포커스가 됨", async ({
    page,
  }) => {
    const loginApiPattern = "**/member/login*";
    let loginApiCalled = false;
    await page.route(loginApiPattern, async (route) => {
      loginApiCalled = true;
      await route.abort();
    });

    await test.step("아이디만 입력", async () => {
      await page.getByPlaceholder("아이디").fill(CREDENTIALS.id);
      await expect(page.getByPlaceholder("비밀번호")).toHaveValue("");
      await expect(loginBtn(page)).toBeEnabled();
    });

    await test.step("로그인 시도 후 alert 확인", async () => {
      const whenDialog = page
        .waitForEvent("dialog", { timeout: 5000 })
        .then(async (d) => {
          await expect(d.message()).toContain("비밀번호를 입력해 주세요"); // 실제 문구
          await d.accept();
        });

      await loginBtn(page).click();
      await whenDialog; // dialog 검증/처리가 실제로 수행됐는지 보장
    });

    await test.step("API 요청이 발생하지 않음", async () => {
      expect(loginApiCalled).toBe(false);
    });

    await test.step("페이지/포커스 유지", async () => {
      await expect(page).toHaveURL(/\/user-account\/login(?:\?.*)?$/);
      await expect(page.getByPlaceholder("비밀번호")).toBeFocused();
    });
  });
});
