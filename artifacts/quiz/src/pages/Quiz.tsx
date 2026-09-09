import { useEffect, useRef } from "react";

export default function Quiz() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const quizTokenRef = useRef<string | null>(null);

  useEffect(() => {
    async function refreshQuizToken() {
      const response = await fetch('/api/quiz-token', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to start quiz session');
      const data = await response.json();
      quizTokenRef.current = data.token;
      iframeRef.current?.contentWindow?.postMessage({
        type: 'mhb_quiz_token',
        token: data.token,
      }, window.location.origin);
    }

    refreshQuizToken().catch(() => {});

    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'mhb_quiz_ready') {
        if (quizTokenRef.current) {
          iframeRef.current?.contentWindow?.postMessage({
            type: 'mhb_quiz_token',
            token: quizTokenRef.current,
          }, window.location.origin);
        }
        return;
      }
      if (!event.data || event.data.type !== 'mhb_quiz_result') return;
      const result = {
        score: event.data.score,
        tier: event.data.tier,
        completedAt: event.data.completedAt,
      };
      localStorage.setItem('mhb_quiz_result', JSON.stringify(result));
      fetch('/api/quiz-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...result, quizToken: event.data.quizToken }),
      }).then((response) => {
        if (response.ok) refreshQuizToken().catch(() => {});
      }).catch(() => {});
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={`${import.meta.env.BASE_URL}quiz.html`}
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
        display: "block",
      }}
      title="Home Health Score Quiz"
    />
  );
}
