import { NextResponse } from "next/server";
import {
  getPortalByToken,
  isExpired,
} from "@/lib/customer-portal-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ token: string }>;
  },
) {
  const { token } = await context.params;
  const record =
    await getPortalByToken(token);

  if (!record) {
    return NextResponse.json(
      { error: "Niet gevonden." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    status: isExpired(record)
      ? "Verlopen"
      : record.status,
    viewedAt: record.viewedAt,
    pdfDownloadedAt:
      record.pdfDownloadedAt,
    expiresAt: record.expiresAt,
    approval: record.approval,
  });
}
