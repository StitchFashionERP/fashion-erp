import {
  createHash,
} from "node:crypto";
import { NextResponse } from "next/server";
import {
  createPortalToken,
  createVerificationCode,
  hashValue,
  savePortalRecord,
} from "@/lib/customer-portal-store";
import type {
  CustomerPortalRecord,
  PortalCompanySnapshot,
  PortalOrderSnapshot,
} from "@/lib/customer-portal-types";

export const runtime = "nodejs";

type RequestBody = {
  order: PortalOrderSnapshot;
  company: PortalCompanySnapshot;
  pdfFilename: string;
  pdfBase64: string;
  expiresInDays?: number;
};

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as RequestBody;

    if (
      !body.order?.orderId ||
      !body.order?.orderNumber ||
      !body.pdfBase64
    ) {
      return NextResponse.json(
        {
          error:
            "Ordergegevens of PDF ontbreken.",
        },
        { status: 400 },
      );
    }

    const token = createPortalToken();
    const verificationCode =
      createVerificationCode();
    const createdAt =
      new Date().toISOString();
    const expiresInDays = Math.min(
      60,
      Math.max(
        1,
        body.expiresInDays || 14,
      ),
    );
    const expiresAt = new Date(
      Date.now() +
        expiresInDays *
          24 *
          60 *
          60 *
          1000,
    ).toISOString();

    const documentHash = createHash(
      "sha256",
    )
      .update(body.pdfBase64)
      .digest("hex");

    const record: CustomerPortalRecord = {
      id: `portal-${Date.now()}`,
      token,
      verificationCodeHash:
        hashValue(verificationCode),
      createdAt,
      expiresAt,
      status: "Aangemaakt",
      viewedAt: null,
      pdfDownloadedAt: null,
      order: body.order,
      company: body.company,
      pdfFilename:
        body.pdfFilename ||
        `Orderbevestiging-${body.order.orderNumber}.pdf`,
      pdfBase64: body.pdfBase64,
      documentHash,
      approval: null,
    };

    await savePortalRecord(record);

    const origin = new URL(
      request.url,
    ).origin;

    return NextResponse.json({
      token,
      portalUrl: `${origin}/portal/order/${token}`,
      verificationCode,
      expiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Aanmaken is mislukt.",
      },
      { status: 500 },
    );
  }
}
