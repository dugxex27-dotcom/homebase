import { useEffect } from "react";

export default function Quiz() {
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
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
        body: JSON.stringify(result),
      }).catch(() => {});
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <iframe
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
