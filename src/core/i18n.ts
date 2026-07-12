export type Language = 'ja' | 'en';

type Dictionary = {
  [key: string]: string;
};

const ja: Dictionary = {
  // Common
  'app.subtitle': 'MIDI to MP3 Converter — 合唱練習用音源自動生成ツール',
  'app.footer1': 'Vertere（うぇるてーれ）- MIDI to MP3 Converter — 合唱練習用音源自動生成ツール',
  'app.footer2': 'すべての処理はブラウザ内で完結します。サーバーへのデータ送信はありません。',
  'step1.label': 'Step 1',
  'step1.title': 'MIDIファイルをアップロード',
  'dropzone.text': 'ここにMIDIファイルをドラッグ＆ドロップ',
  'dropzone.hint': 'または、クリックしてファイルを選択（.mid / .midi）',
  'upload.status.parsed': '{0}トラックを読み込みました',
  'upload.status.parsing': 'MIDIを解析中...',
  'upload.status.error': 'エラー: {0}',
  'upload.validation.ext': 'MIDIファイル（.mid / .midi）のみ選択できます',
  'upload.validation.size': 'ファイルサイズ上限（10MB）を超えています: {0}',
  'upload.remove': '{0}を削除',
  'step2.label': 'Step 2',
  'step2.title': 'トラック設定',
  'step2.empty': 'MIDIファイルをアップロードすると、ここに各トラックの楽器やパートの割り当て設定が表示されます。',
  'choir.type.label': '合唱編成',
  'choir.type.hint': '編成を選ぶとパートを自動で割り当てます',
  'choir.type.mixed': '混声4部',
  'choir.type.women3': '女声3部',
  'choir.type.women4': '女声4部',
  'choir.type.men3': '男声3部',
  'choir.type.men4': '男声4部',
  'table.track': 'Track',
  'table.part': 'Part',
  'table.partName': 'パート名',
  'table.instrument': 'Instrument',
  'role.MezzoSoprano': 'Mezzo-Soprano',
  'role.Percussion': '打楽器',
  'role.Excluded': '除外',
  'instrument.clarinet': 'クラリネット',
  'instrument.piano': 'ピアノ',
  'instrument.woodblock': 'ウッドブロック',
  'volume.label': '主役以外の音量',
  'step3.label': 'Step 3',
  'step3.title': '生成 & ダウンロード',
  'step3.hint': '※ブラウザ内で高品質な音声波形を合成・エンコードするため、完了までに数十秒〜数分かかる場合があります。',
  'btn.generate': '練習音源を生成',
  'btn.processing': '処理中...',
  'btn.download': 'ZIPを再ダウンロード',
  'phase.idle': '待機中',
  'phase.rendering': 'レンダリング中',
  'phase.encoding': 'MP3エンコード中',
  'phase.zipping': 'ZIP作成中',
  'phase.done': '完了',
  'phase.error': 'エラー',
  'error.noMidi': 'MIDIデータが見つかりません',
  'progress.status': '{0} を{1}... ({2}/{3})',
  'progress.status.all': 'Allミックス を{0}...',
  'progress.status.error': 'エラー: {0}',
};

const en: Dictionary = {
  // Common
  'app.subtitle': 'MIDI to MP3 Converter — Generate choir practice tracks automatically',
  'app.footer1': 'Vertere（うぇるてーれ）- MIDI to MP3 Converter — Generate choir practice tracks',
  'app.footer2': 'All processing is done completely in your browser. No data is sent to a server.',
  'step1.label': 'Step 1',
  'step1.title': 'Upload MIDI File',
  'dropzone.text': 'Drag and drop a MIDI file here',
  'dropzone.hint': 'Or click to select a file (.mid / .midi)',
  'upload.status.parsed': 'Loaded {0} tracks',
  'upload.status.parsing': 'Parsing MIDI...',
  'upload.status.error': 'Error: {0}',
  'upload.validation.ext': 'Only MIDI files (.mid / .midi) are supported',
  'upload.validation.size': 'File size exceeds limit (10MB): {0}',
  'upload.remove': 'Remove {0}',
  'step2.label': 'Step 2',
  'step2.title': 'Track Configuration',
  'step2.empty': 'Upload a MIDI file, and the instrument and part assignment settings for each track will appear here.',
  'choir.type.label': 'Choir Type',
  'choir.type.hint': 'Select a type to automatically assign parts',
  'choir.type.mixed': 'Mixed 4 Parts',
  'choir.type.women3': "Women's 3 Parts",
  'choir.type.women4': "Women's 4 Parts",
  'choir.type.men3': "Men's 3 Parts",
  'choir.type.men4': "Men's 4 Parts",
  'table.track': 'Track',
  'table.part': 'Part',
  'table.partName': 'Part Name',
  'table.instrument': 'Instrument',
  'role.MezzoSoprano': 'Mezzo-Soprano',
  'role.Percussion': 'Percussion',
  'role.Excluded': 'Exclude',
  'instrument.clarinet': 'Clarinet',
  'instrument.piano': 'Piano',
  'instrument.woodblock': 'Woodblock',
  'volume.label': 'Background Volume',
  'step3.label': 'Step 3',
  'step3.title': 'Generate & Download',
  'step3.hint': '* Since high-quality audio waveforms are synthesized and encoded in the browser, completion may take from a few seconds to a few minutes.',
  'btn.generate': 'Generate Audio',
  'btn.processing': 'Processing...',
  'btn.download': 'Download ZIP Again',
  'phase.idle': 'Idle',
  'phase.rendering': 'Rendering',
  'phase.encoding': 'Encoding MP3',
  'phase.zipping': 'Creating ZIP',
  'phase.done': 'Done',
  'phase.error': 'Error',
  'error.noMidi': 'MIDI data not found',
  'progress.status': '{1} {0}... ({2}/{3})',
  'progress.status.all': '{0} All Mix...',
  'progress.status.error': 'Error: {0}',
};

const dictionaries: Record<Language, Dictionary> = {
  ja,
  en,
};

let currentLanguage: Language = 'ja';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: string, ...args: (string | number)[]): string {
  const dict = dictionaries[currentLanguage] || dictionaries.ja;
  let str = dict[key] !== undefined ? dict[key] : key;
  args.forEach((arg, i) => {
    str = str.replace(`{${i}}`, String(arg));
  });
  return str;
}
