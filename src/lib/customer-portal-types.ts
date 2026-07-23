export type PortalOrderLine = {
  productCode: string;
  productName: string;
  sku: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  lineTotal: number;
};

export type PortalOrderSnapshot = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  contactPerson: string;
  email: string;
  orderDate: string;
  requestedDeliveryDate: string;
  paymentDays: number;
  notes: string;
  subtotal: number;
  vat: number;
  total: number;
  currency: string;
  lines: PortalOrderLine[];
};

export type PortalCompanySnapshot = {
  name: string;
  tradeName: string;
  email: string;
  phone: string;
  website: string;
  logoDataUrl: string;
};

export type PortalStatus =
  | "Aangemaakt"
  | "Bekeken"
  | "Goedgekeurd"
  | "Verlopen"
  | "Ingetrokken";

export type PortalApproval = {
  approvedAt: string;
  signerName: string;
  signerEmail: string;
  signatureDataUrl: string;
  ipAddress: string;
  userAgent: string;
  documentHash: string;
};

export type CustomerPortalRecord = {
  id: string;
  token: string;
  verificationCodeHash: string;
  createdAt: string;
  expiresAt: string;
  status: PortalStatus;
  viewedAt: string | null;
  pdfDownloadedAt: string | null;
  order: PortalOrderSnapshot;
  company: PortalCompanySnapshot;
  pdfFilename: string;
  pdfBase64: string;
  documentHash: string;
  approval: PortalApproval | null;
};

export type CustomerPortalSummary = {
  token: string;
  portalUrl: string;
  verificationCode: string;
  expiresAt: string;
};

export type PublicPortalRecord = Omit<
  CustomerPortalRecord,
  "verificationCodeHash" | "pdfBase64"
> & {
  verified: boolean;
};
