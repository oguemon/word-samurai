// 単語ページの遷移まわりの補助。開いた元のリストの並び（前後移動）と、
// 遷移元（左上の戻るリンクの文言・リンク先）を React Router の location.state で受け渡す。

/** 単語ページ左上の「戻る」リンク。遷移元ページごとに文言とリンク先を変える */
export type WordNavOrigin = {
  /** 戻るリンクの文言（先頭の「‹ 」は付けない） */
  label: string;
  /** 戻り先のパス（クエリを含んでよい） */
  to: string;
};

export type WordNavState = {
  /** 前後移動をこの並び（単語IDのリスト）に沿わせる。渡されない場合は辞書順にフォールバックする */
  sequence?: string[];
  /** 左上の戻るリンク。渡されない場合は単語一覧（"/"）にフォールバックする */
  origin?: WordNavOrigin;
};

/** 遷移元が不明なときの既定の戻り先（単語一覧） */
export const DEFAULT_WORD_BACK: WordNavOrigin = { label: '単語一覧', to: '/' };

/** 未知の値（location.state）から並びを安全に取り出す。文字列の並びが無ければ null */
export const readNavSequence = (state: unknown): string[] | null => {
  if (typeof state !== 'object' || state === null) return null;
  const seq = (state as { sequence?: unknown }).sequence;
  if (!Array.isArray(seq)) return null;
  const ids = seq.filter((x): x is string => typeof x === 'string');
  return ids.length > 0 ? ids : null;
};

/** 未知の値（location.state）から遷移元を安全に取り出す。無ければ null */
export const readNavOrigin = (state: unknown): WordNavOrigin | null => {
  if (typeof state !== 'object' || state === null) return null;
  const origin = (state as { origin?: unknown }).origin;
  if (typeof origin !== 'object' || origin === null) return null;
  const { label, to } = origin as { label?: unknown; to?: unknown };
  if (typeof label !== 'string' || typeof to !== 'string') return null;
  return { label, to };
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
