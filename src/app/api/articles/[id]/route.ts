import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ProductPayload = Record<string, unknown>;
type VariantPayload = Record<string, unknown>;

type ExistingVariantRow = Record<string, unknown> & {
  id?: unknown;
  legacy_id?: unknown;
  sku?: unknown;
  color?: unknown;
  size?: unknown;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown, fallback: unknown = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : Number(fallback) || 0;
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function getVariantKey(variant: Record<string, unknown>) {
  return [
    normalizeText(variant.sku).toLowerCase(),
    normalizeText(variant.color).toLowerCase(),
    normalizeText(variant.size).toLowerCase(),
  ].join("|");
}

function rowToProduct(row: Record<string, unknown>) {
  const profile = asRecord(row.profile);

  const variants = Array.isArray(row.product_variants)
    ? (row.product_variants as Record<string, unknown>[]).map(
        (variantRow) => {
          const variantProfile = asRecord(
            variantRow.profile,
          );

          return {
            ...variantProfile,
            id: String(
              variantRow.id ??
                variantProfile.id ??
                "",
            ),
            sku: String(
              variantRow.sku ??
                variantProfile.sku ??
                "",
            ),
            color: String(
              variantRow.color ??
                variantProfile.color ??
                "",
            ),
            size: String(
              variantRow.size ??
                variantProfile.size ??
                "",
            ),
            ean:
              String(
                variantRow.barcode ??
                  variantProfile.ean ??
                  "",
              ) || undefined,
            supplierVariantCode:
              String(
                variantProfile.supplierVariantCode ??
                  "",
              ) || undefined,
            physicalStock: asNumber(
              variantProfile.physicalStock,
            ),
            reservedStock: asNumber(
              variantProfile.reservedStock,
            ),
            purchasePrice: asNumber(
              variantProfile.purchasePrice,
              row.purchase_price,
            ),
            wholesalePrice: asNumber(
              variantProfile.wholesalePrice,
              row.sales_price,
            ),
            shippingCosts: asNumber(
              variantProfile.shippingCosts,
            ),
            otherCosts: asNumber(
              variantProfile.otherCosts,
            ),
            totalCost: asNumber(
              variantProfile.totalCost,
              row.purchase_price,
            ),
            brandMarkup: asNumber(
              variantProfile.brandMarkup,
            ),
            recommendedRetailPrice: asNumber(
              variantProfile.recommendedRetailPrice,
            ),
            retailerMarkup: asNumber(
              variantProfile.retailerMarkup,
            ),
          };
        },
      )
    : [];

  return {
    ...profile,
    colors: Array.isArray(profile.colors)
      ? [...new Set(profile.colors as string[])]
      : [],
    id: String(row.id ?? ""), 
    code: String(
      row.product_code ?? profile.code ?? "",
    ),
    name: String(row.name ?? profile.name ?? ""),
    brand: String(
      row.brand ?? profile.brand ?? "",
    ),
    collection: String(
      row.season ?? profile.collection ?? "",
    ),
    category: String(
      row.category ?? profile.category ?? "",
    ),
    material: String(
      row.material ?? profile.material ?? "",
    ),
    vatCode: String(
      row.vat_code ?? profile.vatCode ?? "2V",
    ),
    purchasePrice: asNumber(
      row.purchase_price,
      profile.purchasePrice,
    ),
    wholesalePrice: asNumber(
      row.sales_price,
      profile.wholesalePrice,
    ),
    status:
      row.active === false
        ? "Inactief"
        : String(profile.status ?? "Actief"),
    variants,
    createdAt: String(
      row.created_at ?? profile.createdAt ?? "",
    ),
    updatedAt: String(
      row.updated_at ?? profile.updatedAt ?? "",
    ),
  };
}

async function getContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new ApiError(
      "Je sessie is verlopen. Log opnieuw in.",
      401,
    );
  }

  const {
    data: memberships,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("active", true);

  if (membershipError) {
    throw new ApiError(
      membershipError.message,
      500,
    );
  }

  const organizationIds = (memberships ?? [])
    .map(
      (membership: {
        organization_id?: unknown;
      }) =>
        String(
          membership.organization_id ?? "",
        ),
    )
    .filter(Boolean);

  if (!organizationIds.length) {
    throw new ApiError(
      "Er is geen actieve organisatie aan dit account gekoppeld.",
      403,
    );
  }

  const { data: preference } = await supabase
    .from("user_preferences")
    .select("active_organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const preferred = String(
    preference?.active_organization_id ?? "",
  );

  return {
    supabase,
    organizationId: organizationIds.includes(
      preferred,
    )
      ? preferred
      : organizationIds[0],
  };
}

async function findProduct(id: string) {
  const { supabase, organizationId } =
    await getContext();

  const decodedId = decodeURIComponent(id);

  const { data, error } = await supabase
    .from("products")
    .select("*, product_variants(*)")
    .eq("organization_id", organizationId)
    .or(
      `id.eq.${decodedId},legacy_id.eq.${decodedId}`,
    )
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 500);
  }

  if (!data) {
    throw new ApiError(
      "Artikel niet gevonden.",
      404,
    );
  }

  return {
    supabase,
    organizationId,
    product: data,
  };
}

function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "De artikelbewerking is mislukt.",
    },
    { status: 500 },
  );
}

function isForeignKeyError(error: {
  code?: string;
  message?: string;
}) {
  return (
    error.code === "23503" ||
    String(error.message ?? "")
      .toLowerCase()
      .includes("foreign key constraint")
  );
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const { product } = await findProduct(id);

    return NextResponse.json(
      rowToProduct(
        product as Record<string, unknown>,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const payload =
      (await request.json()) as ProductPayload;

    const {
      supabase,
      organizationId,
      product,
    } = await findProduct(id);

    const productId = String(product.id);
    const now = new Date().toISOString();

    const productRow = {
      product_code: String(
        payload.code ?? "",
      ).trim(),
      name: String(payload.name ?? "").trim(),
      brand:
        String(payload.brand ?? "") || null,
      season:
        String(payload.collection ?? "") ||
        null,
      category:
        String(payload.category ?? "") || null,
      material:
        String(payload.material ?? "") || null,
      vat_code: String(
        payload.vatCode ?? "2V",
      ),
      sales_price: asNumber(
        payload.wholesalePrice,
      ),
      purchase_price: asNumber(
        payload.purchasePrice,
      ),
      active:
        String(payload.status ?? "Concept") !==
        "Inactief",
      profile: payload,
      updated_at: now,
    };

    const { error: updateError } =
      await supabase
        .from("products")
        .update(productRow)
        .eq("id", productId)
        .eq(
          "organization_id",
          organizationId,
        );

    if (updateError) {
      throw new ApiError(
        updateError.message,
        500,
      );
    }

    const existingVariants = Array.isArray(
      product.product_variants,
    )
      ? (product.product_variants as ExistingVariantRow[])
      : [];

    const incomingVariants = Array.isArray(
      payload.variants,
    )
      ? (payload.variants as VariantPayload[])
      : [];

    const handledVariantIds = new Set<string>();

    for (const variant of incomingVariants) {
      const incomingId = normalizeText(
        variant.id,
      );

      const incomingKey = getVariantKey(
        variant,
      );

      const existingVariant =
        existingVariants.find(
          (existing) => {
            const databaseId = normalizeText(
              existing.id,
            );

            const legacyId = normalizeText(
              existing.legacy_id,
            );

            return (
              (incomingId &&
                (databaseId === incomingId ||
                  legacyId === incomingId)) ||
              getVariantKey(existing) ===
                incomingKey
            );
          },
        );

      const variantRow = {
        organization_id: organizationId,
        product_id: productId,
        sku: normalizeText(variant.sku),
        color:
          normalizeText(variant.color) || null,
        color_code: null,
        size:
          normalizeText(variant.size) || null,
        barcode:
          normalizeText(variant.ean) || null,
        profile: variant,
      };

      if (existingVariant) {
        const existingVariantId =
          normalizeText(existingVariant.id);

        const { error: variantUpdateError } =
          await supabase
            .from("product_variants")
            .update(variantRow)
            .eq("id", existingVariantId)
            .eq(
              "organization_id",
              organizationId,
            );

        if (variantUpdateError) {
          throw new ApiError(
            variantUpdateError.message,
            500,
          );
        }

        handledVariantIds.add(
          existingVariantId,
        );

        continue;
      }

      const { error: variantInsertError } =
        await supabase
          .from("product_variants")
          .insert({
            ...variantRow,
            legacy_id: incomingId || null,
          });

      if (variantInsertError) {
        throw new ApiError(
          variantInsertError.message,
          500,
        );
      }
    }

    const removedVariants =
      existingVariants.filter(
        (variant) =>
          !handledVariantIds.has(
            normalizeText(variant.id),
          ),
      );

    for (const variant of removedVariants) {
      const variantId = normalizeText(
        variant.id,
      );

      if (!variantId) {
        continue;
      }

      const { error: variantDeleteError } =
        await supabase
          .from("product_variants")
          .delete()
          .eq("id", variantId)
          .eq("product_id", productId)
          .eq(
            "organization_id",
            organizationId,
          );

      if (
        variantDeleteError &&
        !isForeignKeyError(variantDeleteError)
      ) {
        throw new ApiError(
          variantDeleteError.message,
          500,
        );
      }

      /*
       * Varianten die al in een verkooporder zijn
       * gebruikt, blijven bewust bestaan. Hierdoor
       * blijft de historische orderregel geldig.
       */
    }

    const { data, error } = await supabase
      .from("products")
      .select("*, product_variants(*)")
      .eq("id", productId)
      .single();

    if (error) {
      throw new ApiError(error.message, 500);
    }

    return NextResponse.json(
      rowToProduct(
        data as Record<string, unknown>,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const {
      supabase,
      organizationId,
      product,
    } = await findProduct(id);

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq(
        "organization_id",
        organizationId,
      );

    if (error) {
      throw new ApiError(error.message, 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}