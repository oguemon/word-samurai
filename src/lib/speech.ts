// ブラウザ内蔵の音声合成（Web Speech API / SpeechSynthesis）による発音再生。
// 追加アセット・外部APIは使わない。非対応環境では何もしない。

export const canSpeak = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

// getVoices() は非同期に埋まることがあるため、初回と voiceschanged の両方で取得する
let voices: SpeechSynthesisVoice[] = [];
const loadVoices = (): void => {
  voices = speechSynthesis.getVoices();
};
if (canSpeak()) {
  loadVoices();
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

/** 英語音声を選ぶ。端末内蔵の en-US を優先し、無ければ英語系。見つからなければブラウザ既定に任せる */
const pickEnglishVoice = (): SpeechSynthesisVoice | undefined =>
  voices.find((v) => v.lang === 'en-US' && v.localService) ??
  voices.find((v) => v.lang === 'en-US') ??
  voices.find((v) => v.lang.startsWith('en'));

/** 単語を読み上げる。再生中のものはキャンセルして言い直す */
export const speakTerm = (term: string): void => {
  if (!canSpeak()) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(term);
  utterance.lang = 'en-US';
  const voice = pickEnglishVoice();
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
};

/** 再生を止める（ページ離脱時など） */
export const stopSpeaking = (): void => {
  if (canSpeak()) speechSynthesis.cancel();
};
