import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/auth/current-context";
import { resyncAllVariantStockProfiles } from "@/lib/stock-service";

export async function POST() {
  try {
    const organization = await getCurrentOrganization();
    const count = await resyncAllVariantStockProfiles(
      organization.id,
    );

    return NextResponse.json({ ok: true, count });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Voorraad synchroniseren mislukt.",
      },
      { status: 500 },
    );
  }
}
