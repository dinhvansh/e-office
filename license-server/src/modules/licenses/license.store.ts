export type LicenseRecord = {
  licenseKey: string;
  tenant: string;
  expireDate: string;
  allowedUsers: number;
  allowedDocs: number;
  features: string[];
};

const records: LicenseRecord[] = [
  {
    licenseKey: "WP-SIGN-ENTERPRISE-001",
    tenant: "acme",
    expireDate: "2026-01-01",
    allowedUsers: 50,
    allowedDocs: 10000,
    features: ["otp", "qr", "pki"],
  },
  {
    licenseKey: "WP-SIGN-ONPREM-TRIAL",
    tenant: "trial",
    expireDate: "2025-12-31",
    allowedUsers: 10,
    allowedDocs: 500,
    features: ["otp"],
  },
];

export const licenseStore = {
  findByKey: (licenseKey: string) => records.find((record) => record.licenseKey === licenseKey),
};
