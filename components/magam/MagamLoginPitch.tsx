import {
  MAGAM_LOGIN_CHAT_MEMBER_COUNT,
  MAGAM_LOGIN_CHAT_READ_MARKER,
  MAGAM_LOGIN_CHAT_ROOM_TITLE,
  MAGAM_LOGIN_CHAT_SAMPLE_NAME,
  MAGAM_LOGIN_CHAT_SAMPLE_POST,
  MAGAM_LOGIN_CHAT_SAMPLE_REPLY,
  MAGAM_LOGIN_CHAT_TIME_AFTER,
  MAGAM_LOGIN_CHAT_TIME_BEFORE,
  MAGAM_LOGIN_MAGAM_BUBBLE,
  MAGAM_LOGIN_MAGAM_BUBBLE_INTRO,
  MAGAM_LOGIN_TYPING_TEXT,
} from "@/lib/magam/copy";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

const KT_BG = "#BACEE0";
const KT_YELLOW = "#FEE500";

function TypingCaret() {
  return (
    <span
      className="magam-login-caret ml-px inline-block h-[1.05em] w-[2px] translate-y-[1px] bg-[#191919]"
      aria-hidden
    />
  );
}

function ChatMeta({
  time,
  unread,
  className,
}: {
  time: string;
  unread?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 flex-col items-end gap-0.5 pb-1", className)}>
      {unread ? (
        <span className="text-[11px] font-bold leading-none" style={{ color: KT_YELLOW }}>
          {unread}
        </span>
      ) : null}
      <span className="text-[10px] leading-none text-[#5B6472]">{time}</span>
    </div>
  );
}

function ProfileAvatar() {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#D4DDE8]"
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="h-full w-full text-[#9AA8B8]">
        <rect width="40" height="40" fill="#D4DDE8" />
        <circle cx="20" cy="16" r="7" fill="currentColor" opacity="0.55" />
        <ellipse cx="20" cy="34" rx="11" ry="9" fill="currentColor" opacity="0.45" />
      </svg>
    </div>
  );
}

function ReplyPill({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D5DAE1] bg-[#EAEDF0] px-2.5 py-1">
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 shrink-0 text-[#6B7280]"
        fill="none"
        stroke="currentColor"
        aria-hidden
      >
        <path
          d="M4.5 3.5V9.5H10"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 9.5L10 12"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[13px] font-medium leading-none text-[#4B5563]">{text}</span>
    </div>
  );
}

function EmojiButton() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C8CDD4] bg-white"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#8E9299]" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
        <path d="M8.5 14.5c.9 1 2.1 1.5 3.5 1.5s2.6-.5 3.5-1.5" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

/** 로그인 화면 — 단톡방 대화 목업 */
export default function MagamLoginPitch({ className }: Props) {
  return (
    <div
      className={cn(
        "mt-5 w-full overflow-hidden rounded-[20px] border border-[#A8BAC8]/60 bg-white text-left shadow-[0_6px_24px_rgba(0,0,0,0.1)]",
        className
      )}
      style={{ colorScheme: "light" }}
      role="img"
      aria-label="단톡방에서 공고 올리고 ㅁㄱ 댓글 대신 마감 버튼으로 연락처를 가리는 흐름 예시"
    >
      <div className="flex items-center justify-between border-b border-[#E8EAED] bg-white px-4 py-3">
        <div className="w-6" aria-hidden />
        <p className="text-[15px] font-semibold tracking-[-0.3px] text-[#191919]">
          {MAGAM_LOGIN_CHAT_ROOM_TITLE}
        </p>
        <span className="text-[13px] font-medium text-[#8E9299]">{MAGAM_LOGIN_CHAT_MEMBER_COUNT}</span>
      </div>

      <div className="space-y-3 px-3 pb-2 pt-3" style={{ backgroundColor: KT_BG }}>
        <div className="flex items-start justify-start gap-1.5 text-left">
          <ProfileAvatar />
          <div className="min-w-0 flex-1 text-left">
            <p className="mb-1 text-left text-[12px] leading-none text-[#191919]">
              {MAGAM_LOGIN_CHAT_SAMPLE_NAME}
            </p>
            <div className="flex items-end justify-start gap-1.5">
              <div className="w-fit max-w-full text-left">
                <div className="rounded-[18px] rounded-tl-[4px] bg-white px-3 py-2.5">
                  <p className="whitespace-pre-line text-left text-[15px] leading-[1.4] tracking-[-0.2px] text-[#191919]">
                    {MAGAM_LOGIN_CHAT_SAMPLE_POST}
                  </p>
                </div>
                <div className="mt-1 text-left">
                  <ReplyPill text={MAGAM_LOGIN_CHAT_SAMPLE_REPLY} />
                </div>
              </div>
              <ChatMeta time={MAGAM_LOGIN_CHAT_TIME_BEFORE} unread="99" />
            </div>
          </div>
        </div>

        <div className="flex justify-center py-0.5">
          <span className="rounded-full bg-[#00000040] px-3 py-1 text-[11px] font-medium text-white/95">
            {MAGAM_LOGIN_CHAT_READ_MARKER}
          </span>
        </div>

        <div className="flex items-end justify-end gap-1.5">
          <ChatMeta time={MAGAM_LOGIN_CHAT_TIME_AFTER} unread="99" className="items-end" />

          <div className="flex max-w-[78%] flex-col items-end gap-1">
            <div
              className="rounded-[18px] bg-[#FEE500] px-3 py-2"
              style={{ backgroundColor: KT_YELLOW }}
            >
              <p className="text-right text-[15px] leading-[1.35] tracking-[-0.2px] text-[#191919]">
                {MAGAM_LOGIN_MAGAM_BUBBLE_INTRO}
              </p>
            </div>
            <div
              className="rounded-[18px] rounded-tr-[4px] px-3 py-2"
              style={{ backgroundColor: KT_YELLOW }}
            >
              <p className="text-right text-[15px] leading-[1.35] tracking-[-0.2px] text-[#191919]">
                {MAGAM_LOGIN_MAGAM_BUBBLE}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-2 border-t border-[#E8EAED] bg-white px-3 py-2.5">
        <EmojiButton />
        <div className="min-h-[40px] flex-1 rounded-[20px] border border-[#E3E6EC] bg-white px-3.5 py-2.5">
          <p className="text-left text-[15px] leading-[1.35] tracking-[-0.2px] text-[#191919]">
            {MAGAM_LOGIN_TYPING_TEXT}
            <TypingCaret />
          </p>
        </div>
      </div>
    </div>
  );
}
