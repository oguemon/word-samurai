// 単語ページの「前の単語 / 次の単語」を、開いた元のリストの並びに沿わせるための補助。
// 並びは React Router の location.state に載せて渡す（URL には出さない）。

export type WordNavState = {
  /** 前後移動をこの並び（単語IDのリスト）に沿わせる。渡されない場合は辞書順にフォールバックする */
  sequence: string[];
};

/** 未知の値（location.state）から並びを安全に取り出す。文字列の並びが無ければ null */
export const readNavSequence = (state: unknown): string[] | null => {
  if (typeof state !== 'object' || state === null) return null;
  const seq = (state as { sequence?: unknown }).sequence;
  if (!Array.isArray(seq)) return null;
  const ids = seq.filter((x): x is string => typeof x === 'string');
  return ids.length > 0 ? ids : null;
};

/**
 * 並びの中での前後の単語ID。並びにその単語が無ければ null を返す
 * （呼び出し側で辞書順にフォールバックする）。
 */
export const neighborIds = (
  sequence: string[],
  wordId: string,
): { prevId: string | null; nextId: string | null } | null => {
  const i = sequence.indexOf(wordId);
  if (i === -1) return null;
  return {
    prevId: i > 0 ? sequence[i - 1] : null,
    nextId: i < sequence.length - 1 ? sequence[i + 1] : null,
  };
};

/** リストの表示順から、実在する単語IDだけを重複なく取り出して前後移動用の並びにする */
export const toWordSequence = (ids: Iterable<string>, exists: (id: string) => boolean): string[] => {
  const seen = new Set<string>();
  const sequence: string[] = [];
  for (const id of ids) {
    if (!seen.has(id) && exists(id)) {
      seen.add(id);
      sequence.push(id);
    }
  }
  return sequence;
};
