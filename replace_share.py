#!/usr/bin/env python3
"""
Everlight – patch story export (createPostShareFile) in app.js
Makes the share card content-driven (no giant empty space for short posts)
and includes category + streak in the generated story image.
"""

from pathlib import Path
import re
import sys

# Default path used in the original environment. Override with first CLI arg.
DEFAULT_PATH = Path("/mnt/data/everlight/storyfix/app.js")
p = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PATH

if not p.is_file():
    print(f"ERROR: file not found → {p}")
    sys.exit(1)

s = p.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# 1. Replace the entire createPostShareFile function body
# ---------------------------------------------------------------------------
start_marker = "async function createPostShareFile(data) {"
end_marker = "\nasync function copyPostShareLink(data) {"

start = s.find(start_marker)
if start == -1:
    print("ERROR: createPostShareFile function not found")
    sys.exit(1)

end = s.find(end_marker, start)
if end == -1:
    print("ERROR: end marker (copyPostShareLink) not found after createPostShareFile")
    sys.exit(1)

new_fn = r'''async function createPostShareFile(data) {
  const avatarData = await imageUrlToDataUrl(data.avatar);

  // Story export: 9:16 canvas. Card height is content-driven so short posts
  // do not become a giant empty card.
  const targetWidth = 1080;
  const targetHeight = 1920;
  const cardX = 54;
  const cardW = targetWidth - 108;
  const innerX = cardX + 44;
  const innerW = cardW - 88;

  const titleFont = 52;
  const bodyFont = 31;
  const titleLineHeight = 62;
  const bodyLineHeight = 49;
  const titleLines = wrapShareText(data.title, 31, 3);
  const bodyLines = wrapShareText(data.body, 55, 12);
  const category = String(data.category || "").trim();
  const streak = Number(data.streak || 0);

  const avatarSize = 88;
  const avatarX = innerX;
  const headerY = 0;
  const headerH = 176;
  const avatarY = 42;
  const textX = avatarX + avatarSize + 28;

  const titleY = headerH + 82;
  const categoryY = titleY + Math.max(1, titleLines.length) * titleLineHeight + 8;
  const categoryH = category ? 48 : 0;
  const bodyY = categoryY + categoryH + 34;
  const bodyEnd = bodyY + Math.max(1, bodyLines.length) * bodyLineHeight;
  const dividerY = bodyEnd + 40;
  const footerH = 96;
  const cardH = Math.max(520, Math.min(1340, dividerY + footerH));
  const cardY = Math.round((targetHeight - cardH) / 2);
  const footerY = cardY + cardH - 42;

  const avatarMarkup = avatarData
    ? `<defs><clipPath id="storyAvatarClip"><circle cx="${avatarX + avatarSize / 2}" cy="${cardY + avatarY + avatarSize / 2}" r="${avatarSize / 2}"/></clipPath></defs><image href="${escapeXml(avatarData)}" x="${avatarX}" y="${cardY + avatarY}" width="${avatarSize}" height="${avatarSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#storyAvatarClip)"/>`
    : `<circle cx="${avatarX + avatarSize / 2}" cy="${cardY + avatarY + avatarSize / 2}" r="${avatarSize / 2}" fill="#18272b"/><text x="${avatarX + avatarSize / 2}" y="${cardY + avatarY + 56}" text-anchor="middle" fill="#9fc4e7" font-size="38" font-family="Arial">✦</text>`;

  const meta = [data.realName, data.handle].filter(Boolean).join("  ");
  const titleSvg = titleLines.map((line, i) =>
    `<text x="${innerX}" y="${cardY + titleY + i * titleLineHeight}" fill="#f4f6f6" font-size="${titleFont}" font-weight="800" font-family="Arial">${escapeXml(line)}</text>`
  ).join("");
  const categorySvg = category
    ? `<rect x="${innerX}" y="${cardY + categoryY}" width="${Math.max(150, category.length * 18 + 52)}" height="${categoryH}" rx="24" fill="#15252d" stroke="#203943" stroke-width="2"/><text x="${innerX + 26}" y="${cardY + categoryY + 32}" fill="#9fc4e7" font-size="24" font-weight="700" font-family="Arial">${escapeXml(category)}</text>`
    : "";
  const bodySvg = bodyLines.map((line, i) =>
    `<text x="${innerX}" y="${cardY + bodyY + i * bodyLineHeight}" fill="#cbd3d6" font-size="${bodyFont}" font-family="Arial">${escapeXml(line)}</text>`
  ).join("");
  const streakSvg = streak > 0
    ? `<g><rect x="${avatarX + 52}" y="${cardY + avatarY + 62}" width="62" height="42" rx="21" fill="#0b1114" stroke="#30434b" stroke-width="2"/><text x="${avatarX + 83}" y="${cardY + avatarY + 91}" text-anchor="middle" font-size="22" font-family="Arial">🔥${escapeXml(String(streak))}</text></g>`
    : "";
  const dateText = data.date || "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}">
    <defs>
      <linearGradient id="storyBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#050708"/>
        <stop offset="50%" stop-color="#0d1518"/>
        <stop offset="100%" stop-color="#050708"/>
      </linearGradient>
      <radialGradient id="storyDepth" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#8badcc" stop-opacity=".10"/>
        <stop offset="65%" stop-color="#55d7cf" stop-opacity=".025"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <filter id="storyShadow" x="-25%" y="-25%" width="150%" height="160%">
        <feDropShadow dx="0" dy="30" stdDeviation="32" flood-color="#000000" flood-opacity=".78"/>
      </filter>
      <filter id="softBlur"><feGaussianBlur stdDeviation="45"/></filter>
    </defs>

    <rect width="1080" height="1920" fill="url(#storyBg)"/>
    <rect width="1080" height="1920" fill="url(#storyDepth)"/>
    <circle cx="70" cy="270" r="190" fill="#8badcc" opacity=".045" filter="url(#softBlur)"/>
    <circle cx="1040" cy="1650" r="240" fill="#55d7cf" opacity=".035" filter="url(#softBlur)"/>

    <g filter="url(#storyShadow)">
      <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="44" fill="#080b0d" stroke="#26373f" stroke-width="3"/>
      <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${headerH}" rx="44" fill="#11191d"/>
      <rect x="${cardX}" y="${cardY + 135}" width="${cardW}" height="41" fill="#11191d"/>
      ${avatarMarkup}
      ${streakSvg}
      <text x="${textX}" y="${cardY + avatarY + 38}" fill="#f1f4f5" font-size="34" font-weight="800" font-family="Arial">${escapeXml(data.accountName)}</text>
      <text x="${textX}" y="${cardY + avatarY + 72}" fill="#849196" font-size="22" font-family="Arial">${escapeXml(meta)}</text>
      <text x="${cardX + cardW - 42}" y="${cardY + avatarY + 70}" text-anchor="end" fill="#7f8b90" font-size="20" font-family="Arial">${escapeXml(dateText)}</text>
      <line x1="${innerX}" y1="${cardY + headerH}" x2="${cardX + cardW - 44}" y2="${cardY + headerH}" stroke="#273238" stroke-width="2"/>
      ${titleSvg}
      ${categorySvg}
      ${bodySvg}
      <line x1="${innerX}" y1="${cardY + dividerY}" x2="${cardX + cardW - 44}" y2="${cardY + dividerY}" stroke="#263238" stroke-width="2"/>
      <text x="${innerX}" y="${footerY}" fill="#8badcc" font-size="22" font-family="Arial">Everlight</text>
      <text x="${cardX + cardW - 44}" y="${footerY}" text-anchor="end" fill="#657378" font-size="18" font-family="Arial">${escapeXml(window.location.host)}</text>
    </g>
  </svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const pngBlob = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#050708";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
      canvas.toBlob((out) => (out ? resolve(out) : reject(new Error("PNG conversion failed"))), "image/png", 1);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });

  return new File([pngBlob], "everlight-story.png", { type: "image/png" });
}
'''

s = s[:start] + new_fn + s[end:]

# ---------------------------------------------------------------------------
# 2. Inject category + streak extraction (robust regex)
# ---------------------------------------------------------------------------
# Look for the date extraction line and insert category/streak right after it.
date_pattern = re.compile(
    r'(const date = card\?\.querySelector\(["\']\.feed-card-author-date["\']\)\?\.textContent\.trim\(\) \|\| ["\'];\s*)'
    r'(const avatar)',
    re.MULTILINE,
)

injection = r'''\1const category = card?.querySelector(".feed-card-category")?.textContent.trim() || "";
  const streakText = card?.querySelector(".feed-card-streak")?.textContent.trim() || "";
  const streak = Number((streakText.match(/\d+/) || [0])[0]);
  \2'''

s, n1 = date_pattern.subn(injection, s, count=1)
if n1 == 0:
    print("WARNING: could not inject category/streak extraction (pattern not found)")

# ---------------------------------------------------------------------------
# 3. Add category & streak to the returned share-data object
# ---------------------------------------------------------------------------
# Match the common object literal that already contains accountName ... date
obj_pattern = re.compile(
    r'(accountName,\s*realName,\s*handle,\s*hashtags,\s*date)(,\s*avatar,\s*title,\s*body,\s*url)',
    re.MULTILINE,
)
s, n2 = obj_pattern.subn(r"\1, category, streak\2", s, count=1)
if n2 == 0:
    # fallback: try the exact string from the original patch
    old = "accountName, realName, handle, hashtags, date, avatar, title, body, url,\n    shareWidth"
    new = "accountName, realName, handle, hashtags, date, category, streak, avatar, title, body, url,\n    shareWidth"
    if old in s:
        s = s.replace(old, new, 1)
        n2 = 1
    else:
        print("WARNING: could not add category/streak to share data object")

p.write_text(s, encoding="utf-8")
print(f"OK – patched {p}")
print(f"  • createPostShareFile replaced")
print(f"  • category/streak extraction injected: {bool(n1)}")
print(f"  • share data object updated: {bool(n2)}")
