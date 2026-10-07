// Thin wrapper around the Web Speech Synthesis API. Any browser without
// support (or any browser where the user denied it) gets a clear,
// graceful message instead of a silent failure - callers should check
// isTTSSupported() before showing the "Read aloud" control, or at least
// before calling speak().

export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, language: "en" | "hi") {
  if (!isTTSSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (!isTTSSupported()) return;
  window.speechSynthesis.cancel();
}
