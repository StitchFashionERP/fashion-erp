import { NextResponse } from "next/server";
import {
  getPortalByToken,
  isExpired,
  updatePortal,
  verifyHash,
} from "@/lib/customer-portal-store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ token: string }>;
  },
) {
  const { token } = await context.params;
  const body = (await request.json()) as {
    code?: string;
    signerName?: string;
    signerEmail?: string;
    signatureDataUrl?: string;
    accepted?: boolean;
  };

  const record =
    await getPortalByToken(token);

  if (!record) {
    return NextResponse.json(
      { error: "Order niet gevonden." },
      { status: 404 },
    );
  }

  if (
    isExpired(record) ||
    record.status === "Ingetrokken"
  ) {
    return NextResponse.json(
      {
        error:
          "Deze toegang is verlopen of ingetrokken.",
      },
      { status: 410 },
    );
  }

  if (
    !body.code ||
    !verifyHash(
      body.code,
      record.verificationCodeHash,
    )
  ) {
    return NextResponse.json(
      { error: "Niet geautoriseerd." },
      { status: 401 },
    );
  }

  if (
    !body.accepted ||
    !body.signerName?.trim() ||
    !body.signerEmail?.trim() ||
    !body.signatureDataUrl?.startsWith(
      "data:image/",
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Naam, e-mailadres, akkoord en handtekening zijn verplicht.",
      },
      { status: 400 },
    );
  }

  const forwarded =
    request.headers.get(
      "x-forwarded-for",
    );
  const ipAddress =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "Onbekend";

  const approvedAt =
    new Date().toISOString();

  const updated = await updatePortal(
    token,
    (current) => ({
      ...current,
      status: "Goedgekeurd",
      viewedAt:
        current.viewedAt || approvedAt,
      approval: {
        approvedAt,
        signerName:
          body.signerName!.trim(),
        signerEmail:
          body.signerEmail!.trim(),
        signatureDataUrl:
          body.signatureDataUrl!,
        ipAddress,
        userAgent:
          request.headers.get(
            "user-agent",
          ) || "Onbekend",
        documentHash:
          current.documentHash,
      },
    }),
  );

  return NextResponse.json({
    status: updated?.status,
    approval: updated?.approval,
  });
}
