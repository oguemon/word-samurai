// SNS共有まわりのユーティリティ。共有先URLは SHARE_URL 定数で一元管理する。
import { SHARE_URL } from './constants';

/** X（Twitter）共有インテントURL。本文にテキスト、末尾にURLを載せる */
export const xShareUrl = (text: string, url: string = SHARE_URL): string =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

/** LINE共有URL。トーク送信画面にテキスト＋URLを流し込む（本文にスコア等を載せられる） */
export const lineShareUrl = (text: string, url: string = SHARE_URL): string =>
  `https://line.me/R/msg/text/?${encodeURIComponent(`${text}\n${url}`)}`;

/** Facebook共有URL。テキストは載せられずURL（OGタグ）のみ */
export const facebookShareUrl = (url: string = SHARE_URL): string =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

/** テキストをクリップボードにコピー。Clipboard API →（不可なら）execCommand の順に試す */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // クリップボードAPIが使えない環境では下のフォールバックへ
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};
