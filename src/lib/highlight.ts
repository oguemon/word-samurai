// 例文の中から「その単語」に当たる箇所を見つけ、下線を引く範囲を求める。
// 例文では動詞の活用・複数形・語尾変化（amenity→amenities など）や、
// イディオムの語間に別語が挟まる形（pick up → pick you up）があるため、
// 単純な文字列一致ではなくトークン単位のステム照合で範囲を特定する。

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z]/g, '');

// 長いものから順に剥がす活用・語形変化の接尾辞
const SUFFIXES = ['ing', 'ied', 'ies', 'edly', 'ted', 'ded', 'ed', 'es', 'er', 'est', 's'];

/** 語形変化を吸収するためのざっくりしたステム化 */
const stem = (raw: string): string => {
  let s = norm(raw);
  for (const suf of SUFFIXES) {
    if (s.endsWith(suf) && s.length - suf.length >= 3) {
      s = s.slice(0, -suf.length);
      break;
    }
  }
  // 語尾の e / y を落とす（contemplate/contemplating, ally/allies など）
  return s.replace(/[ey]$/, '');
};

// ステム照合では拾えない不規則変化の対応表
const IRREGULAR: Record<string, string[]> = {
  overcome: ['overcame', 'overcome'],
};

/** 単語 termWord の活用形として token が該当するか */
const shares = (termWord: string, token: string): boolean => {
  const t = norm(termWord);
  const k = norm(token);
  if (!t || !k) return false;
  if (k === t) return true;
  if (IRREGULAR[t]?.includes(k)) return true;
  const st = stem(termWord);
  const sk = stem(token);
  if (st.length < 3 || sk.length < 3) return k.startsWith(t) || t.startsWith(k);
  return sk.startsWith(st) || st.startsWith(sk);
};

type Token = { text: string; start: number; end: number };

/** 例文を語トークン（位置つき）に分割する */
const tokenize = (sentence: string): Token[] => {
  const re = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;
  const tokens: Token[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence)) !== null) {
    tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return tokens;
};

/**
 * term（単語または句）が sentence 中で占める範囲を [start, end) で返す。
 * 見つからなければ null。
 */
export const findTermSpan = (term: string, sentence: string): [number, number] | null => {
  const tokens = tokenize(sentence);
  const words = term.trim().split(/\s+/);

  // 単語: 最初にステム一致するトークンを下線対象にする
  if (words.length === 1) {
    const hit = tokens.find((tk) => shares(words[0], tk.text));
    return hit ? [hit.start, hit.end] : null;
  }

  // 句: 語順を保ったまま、間に別語が挟まってもよい部分列一致を探し、
  // 最初の語から最後の語までをまとめて下線対象にする
  for (let i = 0; i < tokens.length; i++) {
    if (!shares(words[0], tokens[i].text)) continue;
    let wi = 1;
    let last = i;
    for (let j = i + 1; j < tokens.length && wi < words.length; j++) {
      if (shares(words[wi], tokens[j].text)) {
        last = j;
        wi++;
      }
    }
    if (wi === words.length) return [tokens[i].start, tokens[last].end];
  }
  return null;
};
