import { useEffect, useState } from 'react';
import { searchProducts } from '../data/storeData';
import { parseVoiceListText } from '../lib/voiceParse';
import { useSpeechRecognition } from '../lib/useSpeechRecognition';
import Icon from './Icon';

export default function VoiceAddPanel({ onAdd }) {
  const speech = useSpeechRecognition();
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!speech.transcript) return;
    const phrases = parseVoiceListText(speech.transcript);
    const matched = [];
    const unmatched = [];
    for (const phrase of phrases) {
      const found = searchProducts(phrase);
      if (found.length > 0) {
        onAdd(found[0]);
        matched.push(found[0].name);
      } else {
        unmatched.push(phrase);
      }
    }
    setResult({ transcript: speech.transcript, matched, unmatched });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript]);

  if (!speech.supported) {
    return (
      <p className="voice-unsupported">
        <Icon name="mic" /> זיהוי-דיבור לא נתמך בדפדפן הזה.
      </p>
    );
  }

  return (
    <div className="voice-panel">
      <button
        className={'btn' + (speech.listening ? ' btn--danger btn--ghost' : ' btn--ghost')}
        onClick={() => {
          setResult(null);
          if (speech.listening) speech.stop();
          else speech.start();
        }}
      >
        <Icon name={speech.listening ? 'close' : 'mic'} /> {speech.listening ? 'עצור הקלטה' : 'הוסף בקול'}
      </button>

      {speech.listening && (
        <p className="voice-hint">
          <Icon name="mic" /> מקשיב… למשל: "אני צריך חלב, קפה וביצים"
        </p>
      )}

      {speech.error && <p className="voice-error">שגיאת מיקרופון: {speech.error}</p>}

      {result && (
        <div className="voice-result">
          <p className="voice-transcript">זוהה: "{result.transcript}"</p>
          {result.matched.length > 0 && (
            <p className="voice-matched">
              <Icon name="check" /> נוספו: {result.matched.join(', ')}
            </p>
          )}
          {result.unmatched.length > 0 && (
            <p className="voice-unmatched">
              <Icon name="close" /> לא נמצאו במלאי: {result.unmatched.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
