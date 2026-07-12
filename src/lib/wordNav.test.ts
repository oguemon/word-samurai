import { describe, expect, it } from 'vitest';
import { neighborIds, readNavOrigin, readNavSequence, toWordSequence } from './wordNav';

describe('readNavSequence', () => {
  it('sequence が文字列配列なら取り出す', () => {
    expect(readNavSequence({ sequence: ['a', 'b'] })).toEqual(['a', 'b']);
  });

  it('文字列以外は取り除く', () => {
    expect(readNavSequence({ sequence: ['a', 1, null, 'b'] })).toEqual(['a', 'b']);
  });

  it('state が無い・空・型違いなら null', () => {
    expect(readNavSequence(null)).toBeNull();
    expect(readNavSequence(undefined)).toBeNull();
    expect(readNavSequence({})).toBeNull();
    expect(readNavSequence({ sequence: [] })).toBeNull();
    expect(readNavSequence('a,b')).toBeNull();
  });
});

describe('readNavOrigin', () => {
  it('label と to が文字列なら取り出す', () => {
    expect(readNavOrigin({ origin: { label: '履歴＞テスト', to: '/history?tab=tests' } })).toEqual({
      label: '履歴＞テスト',
      to: '/history?tab=tests',
    });
  });

  it('origin が無い・型違いなら null', () => {
    expect(readNavOrigin(null)).toBeNull();
    expect(readNavOrigin({})).toBeNull();
    expect(readNavOrigin({ origin: { label: '履歴' } })).toBeNull();
    expect(readNavOrigin({ origin: { label: 1, to: '/x' } })).toBeNull();
    expect(readNavOrigin({ sequence: ['a'] })).toBeNull();
  });
});

describe('neighborIds', () => {
  const seq = ['a', 'b', 'c'];

  it('中間の単語は前後を返す', () => {
    expect(neighborIds(seq, 'b')).toEqual({ prevId: 'a', nextId: 'c' });
  });

  it('先頭・末尾は端側が null', () => {
    expect(neighborIds(seq, 'a')).toEqual({ prevId: null, nextId: 'b' });
    expect(neighborIds(seq, 'c')).toEqual({ prevId: 'b', nextId: null });
  });

  it('並びに無い単語は null（辞書順フォールバック用）', () => {
    expect(neighborIds(seq, 'x')).toBeNull();
  });
});

describe('toWordSequence', () => {
  it('表示順のまま、重複と存在しないIDを除く', () => {
    const exists = (id: string) => id !== 'ghost';
    expect(toWordSequence(['a', 'b', 'a', 'ghost', 'c'], exists)).toEqual(['a', 'b', 'c']);
  });

  it('最初の出現位置で順序を決める', () => {
    expect(toWordSequence(['c', 'a', 'c', 'b'], () => true)).toEqual(['c', 'a', 'b']);
  });
});
