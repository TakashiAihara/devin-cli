// list 系エンドポイントのページング helper。
// notes / automations は cursor 方式 (after / end_cursor / first)、
// schedules は旧式の offset 方式 (offset / limit) を使う。
// どちらも has_next_page を見て続きを取り、--limit で打ち切れる

export type Page<T> = {
  items: T[];
  end_cursor?: string | null;
  has_next_page?: boolean | null;
  total?: number | null;
};

// API の 1 ページ上限 (first / limit の maximum は 200)
const PAGE_SIZE = 200;
// 暴走防止。API がカーソルを繰り返したり offset を無視したりしても止まるようにする
const MAX_PAGES = 1000;

// has_next_page が省略された応答でも取りこぼさないよう、total と
// 「ページが一杯返ったか」で続きを推定する
function hasMore<T>(page: Page<T>, fetched: number, want: number): boolean {
  if (typeof page.has_next_page === "boolean") return page.has_next_page;
  if (typeof page.total === "number") return fetched < page.total;
  return page.items.length >= want;
}

// cursor 方式 (after / first)。end_cursor を次の after に渡して辿る
export async function cursorPages<T>(
  fetchPage: (after: string | undefined, first: number) => Promise<Page<T>>,
  maxItems?: number,
): Promise<T[]> {
  const out: T[] = [];
  const seen = new Set<string>();
  let after: string | undefined;
  for (let pages = 0; pages < MAX_PAGES; pages++) {
    const want = maxItems === undefined ? PAGE_SIZE : Math.min(PAGE_SIZE, maxItems - out.length);
    if (want <= 0) break;
    const page = await fetchPage(after, want);
    out.push(...page.items);
    if (maxItems !== undefined && out.length > maxItems) out.length = maxItems;
    if (page.items.length === 0) break;
    if (!hasMore(page, out.length, want)) break;
    const next = page.end_cursor ?? undefined;
    // 続きがあると言われたのに cursor が無い / 同じ cursor が返る場合はこれ以上辿れない
    if (!next || seen.has(next)) break;
    seen.add(next);
    after = next;
  }
  return out;
}

// offset 方式 (offset / limit)。items 数だけ offset を進める
export async function offsetPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<Page<T>>,
  maxItems?: number,
): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  let prevKey: string | undefined;
  for (let pages = 0; pages < MAX_PAGES; pages++) {
    const want = maxItems === undefined ? PAGE_SIZE : Math.min(PAGE_SIZE, maxItems - out.length);
    if (want <= 0) break;
    const page = await fetchPage(offset, want);
    out.push(...page.items);
    if (maxItems !== undefined && out.length > maxItems) out.length = maxItems;
    if (page.items.length === 0) break;
    if (!hasMore(page, out.length, want)) break;
    // offset を無視して同じページを返し続ける API に備えて、進捗が無ければ止める
    const key = JSON.stringify(page.items[0]);
    offset += page.items.length;
    if (key === prevKey) break;
    prevKey = key;
  }
  return out;
}
