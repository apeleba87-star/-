/** 파트너스 API 상품 1건 (배너 노출용) */
export type CoupangBannerProduct = {
  productId: number;
  productName: string;
  productImage: string;
  productPrice: number;
  productUrl: string;
  categoryName?: string;
  isRocket?: boolean;
  isFreeShipping?: boolean;
};

export type CoupangSourceType = "search" | "bestcategory" | "goldbox";

export type CoupangSlotConfig = {
  source: {
    type: CoupangSourceType;
    keyword?: string;
    categoryId?: number;
  };
  limit?: number;
  subId?: string;
  imageSize?: string;
};

export type CoupangApiListResponse = {
  rCode: string;
  rMessage?: string;
  data?: Array<{
    productId?: number;
    productName?: string;
    productImage?: string;
    productPrice?: number;
    productUrl?: string;
    categoryName?: string;
    isRocket?: boolean;
    isFreeShipping?: boolean;
  }>;
};
