import { expect, test } from '@playwright/test';

const token = 'critical-ux-token';

const preOtpResponse = {
  success: true,
  data: {
    signer: { id: 41, name: 'Người ký thử nghiệm', email: 'signer@example.test', role: 'External' },
    sign_request: { id: 21, title: 'Yêu cầu ký thử nghiệm' },
  },
};

const verifiedResponse = {
  ...preOtpResponse,
  data: {
    ...preOtpResponse.data,
    document: { id: 11, title: 'Tài liệu thử nghiệm', original_file_name: 'sample.pdf' },
    fields: [],
    already_signed: false,
  },
};

async function mockSigningApi(page: import('@playwright/test').Page, verifyBody: unknown, postOtpBody: unknown = verifiedResponse) {
  let metadataCalls = 0;
  await page.route(new RegExp(`/public/sign/${token}$`), async (route) => {
    metadataCalls += 1;
    await route.fulfill({ json: metadataCalls === 1 ? preOtpResponse : postOtpBody });
  });
  await page.route(`**/public/sign/${token}/verify-otp`, async (route) => {
    const failed = (verifyBody as { success?: boolean }).success === false;
    await route.fulfill({ status: failed ? 400 : 200, json: verifyBody });
  });
}

async function verifyOtp(page: import('@playwright/test').Page) {
  await page.getByPlaceholder('Nhập mã OTP').fill('123456');
  await page.getByRole('button', { name: /xác thực otp/i }).click();
}

test.describe('critical external signing recovery', () => {
  test('a valid OTP opens the signing surface', async ({ page }) => {
    await mockSigningApi(page, { success: true, data: { verified: true } });
    await page.goto(`/sign/${token}`);
    await verifyOtp(page);
    await expect(page.getByRole('heading', { name: 'Yêu cầu ký thử nghiệm' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '📄 Tài liệu' })).toBeVisible();
  });

  test('missing post-OTP document data renders a recoverable Vietnamese error', async ({ page }) => {
    await mockSigningApi(page, { success: true, data: { verified: true } }, preOtpResponse);
    await page.goto(`/sign/${token}`);
    await verifyOtp(page);
    await expect(page.getByText('Không thể tải tài liệu sau khi xác thực. Vui lòng thử lại.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
  });

  for (const [name, code] of [['invalid', 'OTP_INVALID'], ['expired', 'OTP_EXPIRED']]) {
    test(`${name} OTP remains recoverable`, async ({ page }) => {
      await mockSigningApi(page, { success: false, error: { code, message: 'OTP rejected' } });
      await page.goto(`/sign/${token}`);
      await verifyOtp(page);
      await expect(page.getByRole('button', { name: /xác thực otp/i })).toBeVisible();
      await expect(page.getByText('Yêu cầu ký thử nghiệm')).toBeVisible();
    });
  }
});

test.describe('OTP recovery controls', () => {
  test('accepts a pasted six-digit code and exposes mobile/autofill attributes', async ({ page }) => {
    await mockSigningApi(page, { success: false, error: { code: 'OTP_INVALID' } });
    await page.goto(`/sign/${token}`);
    const input = page.getByPlaceholder('Nhập mã OTP');
    await expect(input).toHaveAttribute('inputmode', 'numeric');
    await expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    await input.evaluate((element) => {
      const event = new Event('paste', { bubbles: true }) as Event & { clipboardData: { getData: () => string } };
      Object.defineProperty(event, 'clipboardData', { value: { getData: () => '12 34-56' } });
      element.dispatchEvent(event);
    });
    await expect(input).toHaveValue('123456');
    await expect(page.getByRole('button', { name: /xác thực otp/i })).toBeEnabled();
  });

  test('shows cooldown and safe delivery recovery after resend responses', async ({ page }) => {
    await page.route(new RegExp(`/public/sign/${token}$`), route => route.fulfill({ json: preOtpResponse }));
    await page.route(`**/public/sign/${token}/send-otp`, route => route.fulfill({ json: { success: true, data: { otp_sent: true, otp_expires_at: new Date(Date.now() + 60_000).toISOString(), resend_cooldown_seconds: 30 } } }));
    await page.goto(`/sign/${token}`);
    await page.getByRole('button', { name: /gửi lại otp/i }).click();
    await expect(page.getByText(/Mã hết hạn sau/)).toBeVisible();
    await expect(page.getByText(/Bạn có thể gửi lại mã sau/)).toBeVisible();
    await expect(page.getByRole('button', { name: /gửi lại otp/i })).toBeDisabled();
  });
});
