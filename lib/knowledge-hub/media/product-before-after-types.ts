export type ProductBeforeAfterPair = {
  beforeUrl: string | null;
  afterUrl: string | null;
  beforeCaption: string | null;
  afterCaption: string | null;
  beforeFocalX: number;
  beforeFocalY: number;
  afterFocalX: number;
  afterFocalY: number;
};

/** 공개·편집 공통 전후 프레임 비율 */
export const BEFORE_AFTER_FRAME_ASPECT = "4 / 5";
