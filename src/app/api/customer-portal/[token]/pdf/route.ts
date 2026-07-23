import { NextResponse } from "next/server";
import {
  getPortalByToken,
  isExpired,
  updatePortal,
  verifyHash,
} from "@/lib/customer-portal-store";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ token: string }>;
  },
) {
  const { token } = await context.params;
  const code =
    new URL(request.url).searchParams.get(
      "code",
    );

  const record =
    await getPortalByToken(token);

  if (!record) {
    return NextResponse.json(
      { error: "Niet gevonden." },
      { status: 404 },
    );
  }

  if (
    isExpired(record) ||
    record.status === "Ingetrokken"
  ) {
    return NextResponse.json(
      { error: "Toegang verlopen." },
      { status: 410 },
    );
  }

  if (
    !code ||
    !verifyHash(
      code,
      record.verificationCodeHash,
    )
  ) {
    return NextResponse.json(
      { error: "Niet geautoriseerd." },
      { status: 401 },
    );
  }

  await updatePortal(
    token,
    (current) => ({
      ...current,
      pdfDownloadedAt:
        current.pdfDownloadedAt ||
        new Date().toISOString(),
    }),
  );

  const bytes = Buffer.from(
    record.pdfBase64,
    "base64",
  );

  return new NextResponse(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition":
        `inline; filename="${record.pdfFilename}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
