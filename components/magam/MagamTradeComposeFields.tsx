"use client";

import {
  MagamChoiceChip,
  MagamFieldLabel,
  MagamSubLabel,
  magamInputClass,
} from "@/components/magam/ui/MagamUi";
import {
  MAGAM_TRADE_CLIENT_COUNT_LABEL,
  MAGAM_TRADE_SALE_PRICE_HELPER,
  MAGAM_TRADE_SPECIAL_NOTES_HINT,
  MAGAM_TRADE_TOTAL_REVENUE_LABEL,
} from "@/lib/magam/copy";
import { MAGAM_TRADE_DETAIL_ANCHOR } from "@/lib/magam/format-listing";
import {
  MAGAM_TRADE_SIDES,
  MAGAM_TRADE_SIDE_LABEL,
  type MagamTradeSide,
} from "@/lib/magam/trade";

type Props = {
  disabled?: boolean;
  tradeSide: MagamTradeSide | "";
  onTradeSideChange: (side: MagamTradeSide) => void;
  tradeClientCount: string;
  onTradeClientCountChange: (value: string) => void;
  tradeTotalRevenueMan: string;
  onTradeTotalRevenueManChange: (value: string) => void;
  salePriceMan: string;
  onSalePriceManChange: (value: string) => void;
  priceNegotiable: boolean;
  onPriceNegotiableChange: (value: boolean) => void;
  specialNotes: string;
  onSpecialNotesChange: (value: string) => void;
};

export default function MagamTradeComposeFields({
  disabled = false,
  tradeSide,
  onTradeSideChange,
  tradeClientCount,
  onTradeClientCountChange,
  tradeTotalRevenueMan,
  onTradeTotalRevenueManChange,
  salePriceMan,
  onSalePriceManChange,
  priceNegotiable,
  onPriceNegotiableChange,
  specialNotes,
  onSpecialNotesChange,
}: Props) {
  return (
    <>
      <div>
        <MagamSubLabel>매매 구분</MagamSubLabel>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {MAGAM_TRADE_SIDES.map((side) => (
            <MagamChoiceChip
              key={side}
              selected={tradeSide === side}
              disabled={disabled}
              onClick={() => onTradeSideChange(side)}
            >
              {MAGAM_TRADE_SIDE_LABEL[side]}
            </MagamChoiceChip>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <MagamFieldLabel htmlFor="trade-client-count">{MAGAM_TRADE_CLIENT_COUNT_LABEL}</MagamFieldLabel>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="trade-client-count"
              type="number"
              min={1}
              inputMode="numeric"
              className={`${magamInputClass} max-w-[140px]`}
              disabled={disabled}
              placeholder="12"
              value={tradeClientCount}
              onChange={(e) => onTradeClientCountChange(e.target.value.replace(/\D/g, ""))}
            />
            <span className="text-sm font-medium text-[#5B6472]">곳</span>
          </div>
        </div>
        <div>
          <MagamFieldLabel htmlFor="trade-total-revenue">{MAGAM_TRADE_TOTAL_REVENUE_LABEL}</MagamFieldLabel>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="trade-total-revenue"
              type="number"
              min={1}
              inputMode="numeric"
              className={`${magamInputClass} max-w-[160px]`}
              disabled={disabled}
              placeholder="3600"
              value={tradeTotalRevenueMan}
              onChange={(e) => onTradeTotalRevenueManChange(e.target.value.replace(/\D/g, ""))}
            />
            <span className="text-sm font-medium text-[#5B6472]">만원</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <MagamSubLabel>희망 판매가</MagamSubLabel>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              inputMode="numeric"
              className={`${magamInputClass} max-w-[160px]`}
              disabled={disabled || priceNegotiable}
              placeholder="2500"
              value={salePriceMan}
              onChange={(e) => onSalePriceManChange(e.target.value.replace(/\D/g, ""))}
            />
            <span className="text-sm font-medium text-[#5B6472]">만원</span>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#141824]">
            <input
              type="checkbox"
              className="accent-[#7C3AED]"
              checked={priceNegotiable}
              disabled={disabled}
              onChange={(e) => {
                onPriceNegotiableChange(e.target.checked);
                if (e.target.checked) onSalePriceManChange("");
              }}
            />
            협의
          </label>
        </div>
        <p className="mt-1.5 text-[13px] text-[#5B6472]">{MAGAM_TRADE_SALE_PRICE_HELPER}</p>
      </div>

      <div className="mt-5">
        <MagamSubLabel>상세 설명 (선택)</MagamSubLabel>
        <textarea
          id={MAGAM_TRADE_DETAIL_ANCHOR}
          className={`${magamInputClass} mt-2 min-h-[88px]`}
          disabled={disabled}
          placeholder={MAGAM_TRADE_SPECIAL_NOTES_HINT}
          value={specialNotes}
          onChange={(e) => onSpecialNotesChange(e.target.value)}
        />
      </div>
    </>
  );
}
