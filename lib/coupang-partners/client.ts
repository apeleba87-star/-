import {
  buildCoupangAuthorization,
  coupangApiPath,
  COUPANG_API_GATEWAY,
} from "@/lib/coupang-partners/hmac";
import type { CoupangApiListResponse, CoupangBannerProduct, CoupangSlotConfig } from "@/lib/coupang-partners/types";

function getCredentials(): { accessKey: string; secretKey: string } | null {
  const accessKey = process.env.COUPANG_PARTNERS_ACCESS_KEY?.trim();
  const secretKey = process.env.COUPANG_PARTNERS_SECRET_KEY?.trim();
  if (!accessKey || !secretKey) return null;
  return { accessKey, secretKey };
}

function mapProducts(data: CoupangApiListResponse["data"]): CoupangBannerProduct[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((p) => p.productUrl && p.productName)
    .map((p) => ({
      productId: Number(p.productId ?? 0),
      productName: String(p.productName),
      productImage: String(p.productImage ?? ""),
      productPrice: Number(p.productPrice ?? 0),
      productUrl: String(p.productUrl),
      categoryName: p.categoryName ? String(p.categoryName) : undefined,
      isRocket: Boolean(p.isRocket),
      isFreeShipping: Boolean(p.isFreeShipping),
    }))
    .slice(0, 5);
}

async function coupangGet(pathWithQuery: string): Promise<CoupangApiListResponse> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error("COUPANG_PARTNERS_ACCESS_KEY / SECRET_KEY 환경변수가 없습니다.");
  }

  const authorization = buildCoupangAuthorization("GET", pathWithQuery, creds.accessKey, creds.secretKey);
  const url = `${COUPANG_API_GATEWAY}${pathWithQuery}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const body = (await res.json()) as CoupangApiListResponse;
  if (!res.ok) {
    throw new Error(body.rMessage || `쿠팡 API HTTP ${res.status}`);
  }
  if (body.rCode !== "0") {
    throw new Error(body.rMessage || `쿠팡 API rCode=${body.rCode}`);
  }
  return body;
}

/** 슬롯 설정에 따라 상품 목록 조회 */
export async function fetchCoupangProductsForConfig(
  config: CoupangSlotConfig,
  slotKey: string
): Promise<CoupangBannerProduct[]> {
  const limit = Math.min(5, Math.max(1, config.limit ?? 3));
  const subId = config.subId?.trim() || slotKey;
  const imageSize = config.imageSize ?? "512x512";

  const { source } = config;

  if (source.type === "search") {
    const path = coupangApiPath("/products/search", {
      keyword: source.keyword,
      limit,
      subId,
      imageSize,
    });
    const res = await coupangGet(path);
    return mapProducts(res.data);
  }

  if (source.type === "bestcategory") {
    const path = coupangApiPath(`/products/bestcategories/${source.categoryId}`, {
      limit,
      subId,
      imageSize,
    });
    const res = await coupangGet(path);
    return mapProducts(res.data);
  }

  const path = coupangApiPath("/products/goldbox", { subId, imageSize });
  const res = await coupangGet(path);
  return mapProducts(res.data).slice(0, limit);
}

export function isCoupangPartnersConfigured(): boolean {
  return Boolean(getCredentials());
}
