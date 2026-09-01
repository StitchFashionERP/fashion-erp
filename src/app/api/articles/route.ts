import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ApiContext = {
  organizationId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

type ProductPayload = Record<string, unknown>;
type VariantPayload = Record<string, unknown>;

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
  return Number.isFinite(parsed) ? parsed : fallback;
}

function statusToActive(status: unknown) {
  return String(status ?? "Concept") !== "Inactief";
}

async function getColorFamilies(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data } = await supabase
    .from("shared_application_state")
    .select("storage_value")
    .eq("storage_key", "stitch-master-data-v1")
    .maybeSingle();

  if (!data?.storage_value) return [];

  try {
    const parsed = JSON.parse(data.storage_value);
    return Array.isArray(parsed.colorFamilies)
      ? parsed.colorFamilies
      : [];
  } catch {
    return [];
  }
}

function rowToProduct(
  row: Record<string, unknown>,
  colorFamilies: { name: string; code: string }[] = [],
) {
  const profile = asRecord(row.profile);
  const variants = Array.isArray(row.product_variants)
    ? (row.product_variants as Record<string, unknown>[]).map((variantRow) => {
        const variantProfile = asRecord(variantRow.profile);
        return {
          ...variantProfile,
          id: String(variantRow.id ?? variantProfile.id ?? ""),
          sku: String(variantRow.sku ?? variantProfile.sku ?? ""),
          color:
            colorFamilies.find(
              (color) =>
                color.code === String(variantRow.color_code ?? ""),
            )?.name ??
            String(
              variantRow.color ??
                variantProfile.color ??
                "",
            ),
          colorCode: String(
            variantRow.color_code ??
              variantProfile.colorCode ??
              "",
          ),
          size: String(variantRow.size ?? variantProfile.size ?? ""),
          ean: String(variantRow.barcode ?? variantProfile.ean ?? "") || undefined,
          supplierVariantCode:
            String(variantProfile.supplierVariantCode ?? "") || undefined,
          physicalStock: asNumber(variantProfile.physicalStock),
          reservedStock: asNumber(variantProfile.reservedStock),
          purchasePrice: asNumber(
            variantProfile.purchasePrice,
            row.purchase_price,
          ),
          wholesalePrice: asNumber(
            variantProfile.wholesalePrice,
            row.sales_price,
          ),
          shippingCosts: asNumber(variantProfile.shippingCosts),
          otherCosts: asNumber(variantProfile.otherCosts),
          totalCost: asNumber(
            variantProfile.totalCost,
            row.purchase_price,
          ),
          brandMarkup: asNumber(variantProfile.brandMarkup),
          recommendedRetailPrice: asNumber(
            variantProfile.recommendedRetailPrice,
          ),
          retailerMarkup: asNumber(variantProfile.retailerMarkup),
        };
      })
    : [];

  return {
    ...profile,
    colors: Array.isArray(profile.colors)
      ? [...new Set(profile.colors as string[])]
      : [],
    id: String(row.id ?? ""), 
    code: String(row.product_code ?? profile.code ?? ""),
    name: String(row.name ?? profile.name ?? ""),
    brand: String(row.brand ?? profile.brand ?? ""),
    supplier: String(profile.supplier ?? ""),
    supplierProductCode: String(
      profile.supplierProductCode ?? "",
    ),
    collection: String(row.season ?? profile.collection ?? ""),
    category: String(row.category ?? profile.category ?? ""),
    material: String(row.material ?? profile.material ?? ""),
    vatCode: String(row.vat_code ?? profile.vatCode ?? "2V"),
    purchasePrice: asNumber(row.purchase_price, profile.purchasePrice),
    wholesalePrice: asNumber(row.sales_price, profile.wholesalePrice),
    recommendedRetailPrice: asNumber(
      profile.recommendedRetailPrice,
    ),
    retailerMarkup: asNumber(
      profile.retailerMarkup,
    ),
    status: row.active === false ? "Inactief" : String(profile.status ?? "Actief"),
    variants,
    createdAt: String(row.created_at ?? profile.createdAt ?? ""),
    updatedAt: String(row.updated_at ?? profile.updatedAt ?? ""),
  };
}

function productToRow(organizationId: string, product: ProductPayload) {
  return {
    organization_id: organizationId,
    legacy_id: String(product.id ?? "") || null,
    product_code: String(product.code ?? "").trim(),
    name: String(product.name ?? "").trim(),
    brand: String(product.brand ?? "") || null,
    season: String(product.collection ?? "") || null,
    category: String(product.category ?? "") || null,
    material: String(product.material ?? "") || null,
    vat_code: String(product.vatCode ?? "2V"),
    sales_price: asNumber(product.wholesalePrice),
    purchase_price: asNumber(product.purchasePrice),
    active: statusToActive(product.status),
    profile: product,
    updated_at: new Date().toISOString(),
  };
}

function variantToRow(
  organizationId: string,
  productId: string,
  variant: VariantPayload,
  colorFamilies: { name: string; code: string }[],
) {
  return {
    organization_id: organizationId,
    product_id: productId,
    legacy_id: String(variant.id ?? "") || null,
    sku: String(variant.sku ?? "").trim(),
    color: String(variant.color ?? "") || null,
    color_code:
      colorFamilies.find(
        (color) =>
          color.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "") ===
          String(variant.color ?? "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ""),
      )?.code ?? null,
    size: String(variant.size ?? "") || null,
    barcode: String(variant.ean ?? "") || null,
    profile: variant,
  };
}

async function getApiContext(): Promise<ApiContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new ApiError("Je sessie is verlopen. Log opnieuw in.", 401);
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("active", true);

  if (membershipError) {
    throw new ApiError(membershipError.message, 500);
  }

  const organizationIds = (memberships ?? [])
    .map((membership: { organization_id?: unknown }) => String(membership.organization_id ?? ""))
    .filter(Boolean);

  if (organizationIds.length === 0) {
    throw new ApiError(
      "Er is geen actieve organisatie aan dit account gekoppeld.",
      403,
    );
  }

  const { data: preferences, error: preferenceError } = await supabase
    .from("user_preferences")
    .select("active_organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (preferenceError) {
    throw new ApiError(preferenceError.message, 500);
  }

  const preferredOrganizationId = String(
    preferences?.active_organization_id ?? "",
  );
  const organizationId = organizationIds.includes(preferredOrganizationId)
    ? preferredOrganizationId
    : organizationIds[0];

  return { organizationId, supabase };
}

function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
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

export async function GET() {
  try {
    const { organizationId, supabase } = await getApiContext();
    const colorFamilies = await getColorFamilies(supabase);
    const { data, error } = await supabase
      .from("products")
      .select("*, product_variants(*)")
      .eq("organization_id", organizationId)
      .order("name");

    if (error) {
      throw new ApiError(error.message, 500);
    }

    const products = (data ?? []).map(
      (row: Record<string, unknown>) => rowToProduct(row, colorFamilies),
    );

    const supplierIds = [
      ...new Set(
        (data ?? [])
          .map((row: Record<string, unknown>) => row.supplier_id)
          .filter(Boolean),
      ),
    ];

    if (supplierIds.length > 0) {
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("id, company_name")
        .in("id", supplierIds);

      const supplierMap = new Map(
        (suppliers ?? []).map((supplier) => [
          supplier.id,
          supplier.company_name,
        ]),
      );

      products.forEach((product, index) => {
        product.supplier = String(
          supplierMap.get(
            (data ?? [])[index].supplier_id,
          ) ?? "",
        );
      });
    }

    console.log(
      "DEBUG SS270520 COLORS",
      products.find((p) => p.code === "SS270520")?.colors,
    );

    



return NextResponse.json(products);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const product = (await request.json()) as ProductPayload;

    if (!String(product.code ?? "").trim() || !String(product.name ?? "").trim()) {
      throw new ApiError("Artikelnummer en artikelnaam zijn verplicht.", 400);
    }

    const { organizationId, supabase } = await getApiContext();
    const colorFamilies = await getColorFamilies(supabase);
    const row = productToRow(organizationId, product);
    const { data: savedProduct, error: productError } = await supabase
      .from("products")
      .insert(row)
      .select("*")
      .single();

    if (productError) {
      throw new ApiError(productError.message, 500);
    }

    const variants = Array.isArray(product.variants)
      ? (product.variants as VariantPayload[])
      : [];

    if (variants.length > 0) {
      const { error: variantError } = await supabase
        .from("product_variants")
        .insert(
          variants.map((variant) =>
            variantToRow(
              organizationId,
              String(savedProduct.id),
              variant,
              colorFamilies,
            ),
          ),
        );

      if (variantError) {
        await supabase.from("products").delete().eq("id", savedProduct.id);
        throw new ApiError(variantError.message, 500);
      }
    }

    const { data, error } = await supabase
      .from("products")
      .select("*, product_variants(*)")
      .eq("id", savedProduct.id)
      .single();

    if (error) {
      throw new ApiError(error.message, 500);
    }

    return NextResponse.json(rowToProduct(
      data as Record<string, unknown>,
      colorFamilies,
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
