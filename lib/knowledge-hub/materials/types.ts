export type MaterialGuideStatus = "draft" | "published" | "archived";

/** DB / admin record — overlays seed MaterialSurfaceGuide */
export type MaterialGuideRecord = {
  materialId: string;
  principle: string;
  donts: string[];
  okHints: string[];
  care: string[];
  status: MaterialGuideStatus;
};
