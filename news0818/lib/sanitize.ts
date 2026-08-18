import { createHash } from "node:crypto";

// 네이버가 준 title/description은 <b> 태그로 검색어를 감싸고, 그 외 문자는
// HTML 엔티티로 이스케이프해서 준다. <b>/</b> 토큰만 정확히 매칭해 화이트리스트로
// 통과시키고, 나머지 조각은 디코드 후 재이스케이프한다. 이 방식은 파서가 아니라
// 정확한 문자열 리터럴 매칭이므로, 네이버가 다른 태그를 섞어 보내도 그 조각은
// 비-태그로 취급되어 무해한 텍스트로 이스케이프된다.
const B_TAG_SPLIT = /(<\/?b>)/g;

function decodeEntities(text: string): string {
  const withoutNamed = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  // &amp;는 마지막에 디코드한다 (다른 엔티티 안의 '&'가 먼저 풀려 이중 디코드되는 것을 막기 위함)
  return withoutNamed.replace(/&amp;/g, "&");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeNaverHtml(raw: string): string {
  const parts = raw.split(B_TAG_SPLIT);
  return parts
    .map((part) => {
      if (part === "<b>" || part === "</b>") return part;
      return escapeHtml(decodeEntities(part));
    })
    .join("");
}

export function stripTagsToText(raw: string): string {
  const withoutTags = raw.replace(/<\/?b>/g, "");
  return decodeEntities(withoutTags);
}

export function makeStableId(link: string, originallink: string): string {
  const basis = link || originallink;
  return createHash("sha1").update(basis).digest("hex").slice(0, 16);
}
