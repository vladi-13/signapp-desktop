// src/pages/CameraSTT.tsx
import { useEffect, useRef, useState } from "react";

export default function CameraSTT() {
  const [transcript, setTranscript] = useState<string>("Pausado");
  const [frame, setFrame] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [backendAlive, setBackendAlive] = useState<boolean | null>(null);

  const runningRef = useRef(false);

  // Health check
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/health");
        setBackendAlive(res.ok);
      } catch {
        setBackendAlive(false);
      }
    };
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  // Polling
  useEffect(() => {
    if (!running) {
      setTranscript("Pausado");
      setFrame("");
      setHistory([]);
      return;
    }

    let stop = false;
    const poll = async () => {
      while (!stop && runningRef.current) {
        try {
          const res = await fetch("http://127.0.0.1:8000/current");
          const data = await res.json();

          setTranscript(data.text || "Pausado");
          setFrame(data.frame ? `data:image/jpeg;base64,${data.frame}` : "");
          setHistory(data.history || []);
        } catch (err) {
          console.error("Polling error:", err);
        }
        await new Promise(r => setTimeout(r, 100));
      }
    };
    poll();
    return () => { stop = true; };
  }, [running]);

  const toggle = async () => {
    const next = !running;
    setRunning(next);
    runningRef.current = next;
    await fetch(next ? "http://127.0.0.1:8000/start" : "http://127.0.0.1:8000/stop");
  };

  const clear = async () => {
    await fetch("http://127.0.0.1:8000/clear");
    setHistory([]);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Video */}
        <div className="bg-white rounded-2xl shadow-soft p-4 border">
          <div className="text-sm font-semibold text-slate-700 mb-2">Cámara (procesada por backend)</div>
          <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
            {frame ? (
              <img src={frame} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                Sin señal
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={toggle}
              className={`px-4 py-2 rounded-xl text-white font-medium ${
                running ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700"
              }`}
            >
              {running ? "Detener" : "Iniciar"}
            </button>
            <button
              onClick={clear}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800"
            >
              Limpiar
            </button>
            <div className="text-xs text-slate-500 flex items-center">
              Backend: {backendAlive === null ? "..." : backendAlive ? "Conectado" : "Desconectado"}
            </div>
          </div>
        </div>

        {/* Resultado */}
        <div className="bg-white rounded-2xl shadow-soft p-4 border">
          <div className="text-sm font-semibold text-slate-700 mb-2">Signo detectado</div>
          <div className="min-h-[200px] rounded-xl border bg-slate-50 p-4 text-slate-700 text-lg font-medium">
            <div className="font-bold text-green-600">{transcript}</div>
            {history.length > 1 && (
              <div className="text-sm text-slate-600 mt-3">
                {history.join(" → ")}
              </div>
            )}
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            * Reconocimiento en tiempo real con MediaPipe + LSTM (Python)
          </div>
        </div>
      </div>
    </div>
  );
}