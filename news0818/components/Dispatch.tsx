"use client";

import {
  formatFullKoreanDateTime,
  formatRankStamp,
  formatTimeStamp,
} from "@/lib/format";
import type { NewsItem, SortOption } from "@/lib/types";

interface DispatchProps {
  item: NewsItem;
  appliedSort: SortOption;
  index: number;
  dividerLabel?: string;
}

const MAX_STAGGER_INDEX = 13;

export default function Dispatch({ item, appliedSort, index, dividerLabel }: DispatchProps) {
  const stamp = appliedSort === "date" ? formatTimeStamp(item.publishedAt) : formatRankStamp(item.rank);
  const stampTitle =
    appliedSort === "date"
      ? formatFullKoreanDateTime(item.publishedAt)
      : `전체 ${item.rank}위`;
  const showExternalLink = item.link !== item.originallink;

  return (
    <>
      {dividerLabel ? (
        <div className="dateDivider" role="separator">
          {dividerLabel}
        </div>
      ) : null}
      <article
        className="dispatch"
        style={{ ["--i" as string]: Math.min(index, MAX_STAGGER_INDEX) }}
      >
        <span className="stamp" title={stampTitle}>
          {stamp}
        </span>
        <h3 className="dispatchTitle">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.titleText}
            dangerouslySetInnerHTML={{ __html: item.titleHtml }}
          />
        </h3>
        <p
          className="dispatchDescription"
          dangerouslySetInnerHTML={{ __html: item.descriptionHtml }}
        />
        <div className="dispatchMeta">
          <span className="dispatchPress">{item.press}</span>
          <span className="dispatchDate">{formatFullKoreanDateTime(item.publishedAt)}</span>
          {showExternalLink ? (
            <a
              className="dispatchOriginal"
              href={item.originallink}
              target="_blank"
              rel="noopener noreferrer"
            >
              원문 ↗
            </a>
          ) : null}
        </div>
      </article>
    </>
  );
}
