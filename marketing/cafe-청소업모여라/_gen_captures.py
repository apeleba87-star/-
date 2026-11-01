# -*- coding: utf-8 -*-
"""Generate example capture PNGs for cafe marketing posts."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
ASSETS = Path(r"C:\Users\apele\.cursor\projects\c-proj-newslett\assets")

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\malgun.ttf",
    r"C:\Windows\Fonts\malgunbd.ttf",
    r"C:\Windows\Fonts\gulim.ttc",
    r"C:\Windows\Fonts\segoeui.ttf",
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    paths = FONT_CANDIDATES
    if bold:
        paths = [r"C:\Windows\Fonts\malgunbd.ttf", *FONT_CANDIDATES]
    for p in paths:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    return ImageFont.load_default()


def watermark(draw: ImageDraw.ImageDraw, w: int, h: int) -> None:
    t = "예시 · 실제 게시 전 본인 캡처로 교체"
    f = font(18)
    bbox = draw.textbbox((0, 0), t, font=f)
    tw = bbox[2] - bbox[0]
    draw.rounded_rectangle((16, h - 44, 16 + tw + 24, h - 12), radius=8, fill=(0, 0, 0, 160))
    draw.text((28, h - 38), t, font=f, fill=(255, 255, 255, 230))


def save(img: Image.Image, folder: str, name: str = "캡처.png") -> Path:
    out_dir = ROOT / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / name
    if img.mode != "RGB":
        img = img.convert("RGB")
    img.save(path, quality=92)
    print("wrote", path)
    return path


def redact_bar(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int]) -> None:
    draw.rounded_rectangle(xy, radius=6, fill=(55, 65, 81))


def kakao_inquiry(detail: bool = False) -> Image.Image:
    w, h = 720, 1280
    img = Image.new("RGBA", (w, h), (186, 206, 224, 255))
    d = ImageDraw.Draw(img)
    # status / header
    d.rectangle((0, 0, w, 96), fill=(255, 255, 255))
    d.text((28, 34), "채팅", font=font(28, True), fill=(17, 24, 39))
    redact_bar(d, (120, 38, 280, 66))
    # bubbles
    y = 140
    bubble = (255, 255, 255)
    msgs = [
        ("안녕하세요. 입주청소 가능할까요?", False),
        ("블로그에 올려두신 글 보고 연락드렸습니다.", False),
        ("네, 가능합니다. 희망 일정이 있으실까요?", True),
    ]
    if detail:
        msgs = [
            ("안녕하세요. 24평 아파트 입주청소 문의드립니다.", False),
            ("○○동이고, 입주 예정일이 이번 주 금요일입니다.", False),
            ("블로그 전후 사진 보고 연락드렸어요.", False),
            ("일정·견적 확인 후 답 드리겠습니다.", True),
        ]
    for text, mine in msgs:
        f = font(26)
        bbox = d.multiline_textbbox((0, 0), text, font=f, spacing=6)
        bw = min(480, bbox[2] - bbox[0] + 36)
        bh = bbox[3] - bbox[1] + 28
        if mine:
            x0 = w - 28 - bw
            fill = (254, 240, 138)
        else:
            x0 = 28
            fill = bubble
        d.rounded_rectangle((x0, y, x0 + bw, y + bh), radius=16, fill=fill)
        d.multiline_text((x0 + 18, y + 12), text, font=f, fill=(17, 24, 39), spacing=6)
        y += bh + 18
    # time
    d.text((w // 2 - 40, y + 8), "오후 2:08", font=font(20), fill=(100, 116, 139))
    watermark(d, w, h)
    return img


def kakao_zoom_line() -> Image.Image:
    w, h = 720, 900
    img = Image.new("RGBA", (w, h), (186, 206, 224, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, w, 88), fill=(255, 255, 255))
    d.text((28, 30), "채팅", font=font(26, True), fill=(17, 24, 39))
    redact_bar(d, (110, 34, 260, 62))
    text = "○○에 올려두신 거 보고\n연락드렸습니다."
    f = font(34, True)
    bbox = d.multiline_textbbox((0, 0), text, font=f, spacing=10)
    bw = bbox[2] - bbox[0] + 48
    bh = bbox[3] - bbox[1] + 40
    x0, y0 = 40, 220
    d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=20, fill=(255, 255, 255))
    d.multiline_text((x0 + 24, y0 + 16), text, font=f, fill=(17, 24, 39), spacing=10)
    d.text((x0, y0 + bh + 20), "↑ 이 한 줄", font=font(24), fill=(15, 118, 110))
    watermark(d, w, h)
    return img


def weekend_noti() -> Image.Image:
    w, h = 720, 1280
    img = Image.new("RGBA", (w, h), (15, 23, 42, 255))
    d = ImageDraw.Draw(img)
    d.text((w // 2 - 60, 80), "토요일 아침", font=font(24), fill=(148, 163, 184))
    # lock-screen style card
    card = (30, 41, 59, 255)
    d.rounded_rectangle((48, 280, w - 48, 480), radius=24, fill=card)
    d.ellipse((72, 320, 128, 376), fill=(254, 229, 36))
    d.text((148, 318), "메시지", font=font(26, True), fill=(248, 250, 252))
    d.text((148, 358), "지금", font=font(20), fill=(148, 163, 184))
    d.text((72, 400), "급하게 입주청소 가능할까요?", font=font(26), fill=(226, 232, 240))
    redact_bar(d, (72, 440, 320, 462))
    watermark(d, w, h)
    return img


def naver_search(variant: int = 1) -> Image.Image:
    w, h = 720, 1280
    img = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, w, 120), fill=(3, 199, 90))
    d.text((28, 40), "NAVER", font=font(28, True), fill=(255, 255, 255))
    d.rounded_rectangle((28, 140, w - 28, 200), radius=24, fill=(243, 244, 246))
    q = "○○동 입주청소" if variant == 1 else "○○구 이사청소"
    d.text((48, 156), q, font=font(26), fill=(17, 24, 39))
    d.text((28, 230), "블로그", font=font(24, True), fill=(3, 120, 60))
    # results
    items = [
        ("○○동 24평 입주청소 전후", "전 · 후 사진과 작업 이야기", True),
        ("근처 업체 모음", "일반 글", False),
        ("청소 팁 모음", "일반 글", False),
    ]
    if variant == 2:
        items[0] = ("○○구 이사청소, 주방·욕실 전후", "최근 올린 현장 기록", True)
    y = 280
    for title, sub, mine in items:
        if mine:
            d.rounded_rectangle((20, y - 12, w - 20, y + 110), radius=12, fill=(236, 253, 245))
            d.text((w - 140, y), "내 글", font=font(20, True), fill=(4, 120, 87))
        d.text((36, y), title, font=font(26, True), fill=(17, 24, 39))
        d.text((36, y + 40), sub, font=font(22), fill=(100, 116, 139))
        y += 140
    watermark(d, w, h)
    return img


def phone_log() -> Image.Image:
    w, h = 720, 1280
    img = Image.new("RGBA", (w, h), (249, 250, 251, 255))
    d = ImageDraw.Draw(img)
    d.text((28, 48), "최근기록", font=font(34, True), fill=(17, 24, 39))
    rows = [
        ("수신", "오후 2:11", "블로그 보고 연락…"),
        ("수신", "오후 2:47", "블로그 보고 연락…"),
        ("부재중", "오후 3:05", "블로그 보고 연락…"),
    ]
    y = 130
    for kind, when, note in rows:
        d.rounded_rectangle((24, y, w - 24, y + 120), radius=16, fill=(255, 255, 255))
        color = (220, 38, 38) if kind == "부재중" else (22, 163, 74)
        d.text((48, y + 22), kind, font=font(24, True), fill=color)
        d.text((140, y + 22), when, font=font(24), fill=(100, 116, 139))
        redact_bar(d, (48, y + 62, 300, y + 88))
        d.text((320, y + 64), note, font=font(20), fill=(148, 163, 184))
        y += 140
    watermark(d, w, h)
    return img


def calendar_busy() -> Image.Image:
    w, h = 720, 1100
    img = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((28, 40), "이번 주 일정", font=font(32, True), fill=(17, 24, 39))
    days = ["월", "화", "수", "목", "금", "토", "일"]
    jobs = {
        0: ["입주 ○○동"],
        1: ["거주 청소"],
        2: ["입주 ○○동", "문의 전화"],
        3: [],
        4: ["이사 청소"],
        5: ["급 문의"],
        6: [],
    }
    y = 120
    for i, day in enumerate(days):
        d.rounded_rectangle((24, y, w - 24, y + 100), radius=14, fill=(249, 250, 251))
        d.text((44, y + 34), day, font=font(26, True), fill=(15, 118, 110))
        texts = jobs.get(i, [])
        if not texts:
            d.text((120, y + 36), "—", font=font(24), fill=(203, 213, 225))
        else:
            d.text((120, y + 24), " · ".join(texts), font=font(24), fill=(31, 41, 55))
            redact_bar(d, (120, y + 60, 360, y + 82))
        y += 112
    watermark(d, w, h)
    return img


def calendar_vs() -> Image.Image:
    w, h = 720, 1000
    img = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((28, 36), "예전과 오늘", font=font(32, True), fill=(17, 24, 39))
    d.rounded_rectangle((24, 110, w - 24, 420), radius=18, fill=(254, 242, 242))
    d.text((48, 140), "예전", font=font(26, True), fill=(185, 28, 28))
    d.text((48, 200), "일 구하는 게 일이었다", font=font(28), fill=(69, 10, 10))
    d.text((48, 260), "빈칸 · 빈칸 · 빈칸", font=font(24), fill=(127, 29, 29))
    d.rounded_rectangle((24, 460, w - 24, 820), radius=18, fill=(236, 253, 245))
    d.text((48, 490), "요즘", font=font(26, True), fill=(4, 120, 87))
    d.text((48, 550), "올렸더니 연락 왔다", font=font(28), fill=(6, 78, 59))
    d.text((48, 610), "월 · 수 · 금 현장", font=font(24), fill=(6, 95, 70))
    d.text((48, 670), "문의가 일정을 채운다", font=font(24), fill=(6, 95, 70))
    watermark(d, w, h)
    return img


def evening_uploaded() -> Image.Image:
    w, h = 720, 1100
    img = Image.new("RGBA", (w, h), (248, 250, 252, 255))
    d = ImageDraw.Draw(img)
    d.text((28, 40), "저녁", font=font(30, True), fill=(17, 24, 39))
    d.text((28, 90), "사진만 찍고 나왔는데", font=font(26), fill=(71, 85, 105))
    d.rounded_rectangle((28, 160, w - 28, 420), radius=20, fill=(255, 255, 255))
    d.text((52, 200), "네이버 블로그", font=font(22), fill=(100, 116, 139))
    d.text((52, 250), "○○동 입주청소 전후", font=font(30, True), fill=(17, 24, 39))
    d.text((52, 310), "오늘 발행됨", font=font(24), fill=(4, 120, 87))
    d.text((52, 360), "현장 사진으로 올린 글", font=font(22), fill=(148, 163, 184))
    d.text((28, 470), "그게 또 일이 되더라고요.", font=font(26), fill=(31, 41, 55))
    watermark(d, w, h)
    return img


def copy_photo(src_name: str, folder: str) -> None:
    src = ASSETS / src_name
    if not src.exists():
        # try jpg/png variants
        for ext in (".jpg", ".jpeg", ".png", ".webp"):
            alt = ASSETS / (Path(src_name).stem + ext)
            if alt.exists():
                src = alt
                break
    if not src.exists():
        print("missing", src_name)
        return
    img = Image.open(src).convert("RGB")
    # light watermark strip
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    watermark(d, img.width, img.height)
    out = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    save(out, folder)


CAPTIONS: dict[str, dict[str, str]] = {
    "01-1주차-월-문의카톡": {
        "scene": "S1",
        "title": "1주차 월요일 · 문의 카톡",
        "body": "오늘 오후 2시.\n“입주청소 가능할까요?”\n\n아침에 올린 글 보고 왔대요.\n이런 문자가 오면, 그날은 좀 다르게 끝납니다.",
        "shot": "카톡 문의 화면(이름·번호 가림). 이 폴더 캡처는 예시이므로 실제 게시 전 본인 캡처로 교체.",
    },
    "02-1주차-화-검색노출": {
        "scene": "S2",
        "title": "1주차 화요일 · 검색 노출",
        "body": "동네 이름 + 청소 쳐봤습니다.\n\n위에 떠 있길래 캡처해 뒀어요.\n누가 보라고 올린 건 아닌데, 혼자 보고 웃었습니다.",
        "shot": "네이버 동네+청소 검색 결과. 예시 → 본인 글 캡처로 교체.",
    },
    "03-1주차-수-전화문의": {
        "scene": "S3",
        "title": "1주차 수요일 · 전화 문의",
        "body": "평일 오후인데 벨이 세 번.\n\n전부 “블로그 보고 연락드렸습니다.”\n청소는 몸으로 하는데, 일은 이렇게 들어오더라고요.",
        "shot": "최근 통화 기록(번호 가림).",
    },
    "04-1주차-목-전후사진": {
        "scene": "S4",
        "title": "1주차 목요일 · 전후 사진",
        "body": "오늘은 글 이야기 말고,\n이 장면만 남깁니다.\n\n찍을 땐 그냥 기록인데\n나중에 보면 그게 일이 됩니다.",
        "shot": "현장 전·후. 예시는 연출 이미지 → 실제 현장 사진으로 교체 권장.",
    },
    "05-1주차-금-일정달력": {
        "scene": "S5",
        "title": "1주차 금요일 · 일정 달력",
        "body": "이번 주 현장 표시해 보니\n빈칸이 생각보다 적네요.\n\n예전이랑 비교하면\n“문의가 와서” 채워진 칸이 많습니다.",
        "shot": "주간 일정(주소·고객명 가림).",
    },
    "06-1주차-토-일한뒤한잔": {
        "scene": "S6",
        "title": "1주차 토요일 · 일 끝난 뒤 한 잔",
        "body": "울퉁불퉁한 하루였는데\n마지막은 이게 남았습니다.\n\n일 잘했다는 증명보다,\n내일 또 전화 올 수도 있다는 느낌.",
        "shot": "차 안 커피·음료 등 여유 장면.",
    },
    "07-2주차-월-보고연락": {
        "scene": "S1",
        "title": "2주차 월요일 · 보고 연락",
        "body": "제일 좋아하는 문장.\n\n“○○에 올려두신 거 보고 연락드렸습니다.”\n\n이 한 줄이면,\n오늘 한 일이 밖으로 나갔다는 뜻입니다.",
        "shot": "카톡 문장 확대(개인정보 가림).",
    },
    "08-2주차-화-검색변화": {
        "scene": "S2",
        "title": "2주차 화요일 · 검색 변화",
        "body": "예전에 안 보이던 검색어인데\n요즘은 가끔 걸립니다.\n\n대단한 비법은 없고\n현장 끝날 때마다 하나씩 남긴 결과예요.",
        "shot": "다른 키워드 검색 결과.",
    },
    "09-2주차-수-구체문의": {
        "scene": "S7",
        "title": "2주차 수요일 · 구체 문의",
        "body": "“얼마예요?”만 오는 날도 있고\n이렇게 자세한 날이 있습니다.\n\n자세한 문의가 오면\n대화가 짧아지고, 성사는 빨라집니다.",
        "shot": "평수·동·입주일 적힌 문의(가림).",
    },
    "10-2주차-목-저녁업로드": {
        "scene": "결과",
        "title": "2주차 목요일 · 저녁 업로드",
        "body": "오늘은 글 쓸 시간이 없었어요.\n사진만 찍고 나왔습니다.\n\n저녁에 보니 글이 올라가 있고\n그게 또 일이 되더라고요.",
        "shot": "앱/웹 UI를 크게 넣지 말 것. ‘올라간 결과’만.",
    },
    "11-2주차-금-초보와오늘": {
        "scene": "S5",
        "title": "2주차 금요일 · 초보와 오늘",
        "body": "처음엔 일 구하는 게 일이었습니다.\n\n지금은\n“올렸더니 연락 왔다”가\n가끔 일정이 됩니다.\n\n초보일 때 듣고 싶었던 말만 적어둡니다.",
        "shot": "예전 vs 요즘 대비 장면.",
    },
    "12-2주차-토-주말알림": {
        "scene": "S8",
        "title": "2주차 토요일 · 주말 알림",
        "body": "쉬는 날 아침에 울리면\n잠깐 귀찮다가,\n금방 고맙습니다.\n\n주말에 오는 문의는\n“급해요”인 경우가 많아요.",
        "shot": "주말 아침 알림(내용 일부 가림).",
    },
}


def write_caption(folder: str) -> None:
    meta = CAPTIONS[folder]
    path = ROOT / folder / "본문.md"
    path.write_text(
        f"# {meta['title']}\n\n"
        f"- 장면 코드: `{meta['scene']}`\n"
        f"- 채널: 당근 카페 「청소업모여라」\n"
        f"- 캡처: `캡처.png` ({meta['shot']})\n\n"
        f"## 카페에 붙일 본문\n\n"
        f"{meta['body']}\n\n"
        f"## 게시 전 체크\n\n"
        f"- [ ] 개인정보 가림 확인\n"
        f"- [ ] 예시 이미지가 아니라 **내 실제 캡처**로 바꿨는지 (가능하면)\n"
        f"- [ ] 본문에 서비스 세일즈 문구 없음\n"
        f"- [ ] 링크·앱 이름 없음 (질문 오면 DM)\n",
        encoding="utf-8",
    )
    print("wrote", path)


def main() -> None:
    mapping = [
        ("01-1주차-월-문의카톡", kakao_inquiry),
        ("02-1주차-화-검색노출", lambda: naver_search(1)),
        ("03-1주차-수-전화문의", phone_log),
        ("05-1주차-금-일정달력", calendar_busy),
        ("07-2주차-월-보고연락", kakao_zoom_line),
        ("08-2주차-화-검색변화", lambda: naver_search(2)),
        ("09-2주차-수-구체문의", lambda: kakao_inquiry(True)),
        ("10-2주차-목-저녁업로드", evening_uploaded),
        ("11-2주차-금-초보와오늘", calendar_vs),
        ("12-2주차-토-주말알림", weekend_noti),
    ]
    for folder, fn in mapping:
        save(fn(), folder)
        write_caption(folder)

    copy_photo("clean-before-after.jpg", "04-1주차-목-전후사진")
    write_caption("04-1주차-목-전후사진")
    copy_photo("after-work-coffee.jpg", "06-1주차-토-일한뒤한잔")
    write_caption("06-1주차-토-일한뒤한잔")

    readme = ROOT / "README.md"
    readme.write_text(
        """# 청소업모여라 · 클린아이덱스 마케팅 팩

채널: 당근 카페 「청소업모여라」  
원칙: 기능 자랑이 아니라 **쓴 뒤 생기는 장면**을 보여 준다.

## 폴더 구성

| 폴더 | 요일 | 장면 |
|------|------|------|
| `01-1주차-월-문의카톡` | 1주 월 | 문의 카톡 |
| `02-1주차-화-검색노출` | 1주 화 | 검색 상위 |
| `03-1주차-수-전화문의` | 1주 수 | 전화 기록 |
| `04-1주차-목-전후사진` | 1주 목 | 전·후 |
| `05-1주차-금-일정달력` | 1주 금 | 일정 |
| `06-1주차-토-일한뒤한잔` | 1주 토 | 여유 한 잔 |
| `07-2주차-월-보고연락` | 2주 월 | “보고 연락” |
| `08-2주차-화-검색변화` | 2주 화 | 검색 변화 |
| `09-2주차-수-구체문의` | 2주 수 | 구체 문의 |
| `10-2주차-목-저녁업로드` | 2주 목 | 저녁에 글 올라감 |
| `11-2주차-금-초보와오늘` | 2주 금 | 예전 vs 오늘 |
| `12-2주차-토-주말알림` | 2주 토 | 주말 알림 |

각 요일 폴더 안:

- `본문.md` — 카페에 붙일 글 + 체크리스트  
- `캡처.png` — **예시** 이미지 (하단에 「예시 · 실제 게시 전 본인 캡처로 교체」)

전체 설명(A~Z): `00-플레이북-AtoZ.md`

## 중요

카페 신뢰가 자산이다. 예시 캡처를 **실제 문의인 척** 올리지 말 것.  
가능하면 같은 구도의 **본인 실캡처**로 교체한 뒤 게시한다.
""",
        encoding="utf-8",
    )
    print("wrote", readme)


if __name__ == "__main__":
    main()
