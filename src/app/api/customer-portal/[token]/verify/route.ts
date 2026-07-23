import { NextResponse } from "next/server";
import {
  getPortalByToken,
  isExpired,
  toPublicPortal,
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
    record.status === "Ingetrokken" ||
    isExpired(record)
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
      body.code.trim(),
      record.verificationCodeHash,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "De verificatiecode is niet juist.",
      },
      { status: 401 },
    );
  }

  const updated = await updatePortal(
    token,
    (current) => ({
      ...current,
      status:
        current.status === "Aangemaakt"
          ? "Bekeken"
          : current.status,
      viewedAt:
        current.viewedAt ||
        new Date().toISOString(),
    }),
  );

  return NextResponse.json(
    toPublicPortal(updated!, true),
  );
}
