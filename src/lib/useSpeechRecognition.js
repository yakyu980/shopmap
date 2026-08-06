import { useCallback, useEffect, useRef, useState } from 'react';

function getRecognitionCtor() {
  return typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;
}

/** עטיפה דקה סביב Web Speech API (זיהוי-דיבור בעברית, he-IL). */
export function useSpeechRecognition() {
  const Ctor = getRecognitionCtor();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recRef = useRef(null);

  useEffect(() => {
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'he-IL';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ');
      setTranscript(text);
    };
    rec.onerror = (e) => setError(e.error || 'unknown');
    rec.onend = () => setListening(false);

    recRef.current = rec;
    return () => {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        /* כבר עצור */
      }
    };
  }, [Ctor]);

  const start = useCallback(() => {
    if (!recRef.current) return;
    setError(null);
    setTranscript('');
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      /* כבר מאזין */
    }
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  return { supported: !!Ctor, listening, transcript, error, start, stop };
}
