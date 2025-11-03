// src/pages/CameraSTT.tsx
import { useEffect, useRef, useState } from "react";

export default function CameraSTT() {
  const [transcript, setTranscript] = useState<string>("Pausado");
  const [frame, setFrame] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [backendAlive, setBackendAlive] = useState<boolean | null>(null);
  const [finalTranslation, setFinalTranslation] = useState<string>(""); // ← NUEVO

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
      setFinalTranslation(""); // ← limpiar al pausar
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

    const endpoint = next ? "start" : "stop";
    const res = await fetch(`http://127.0.0.1:8000/${endpoint}`);

    if (!next) {
      // Solo al detener
      const data = await res.json();
      setFinalTranslation(data.traduccion_refinada || "");
    }
  };

  const clear = async () => {
    await fetch("http://127.0.0.1:8000/clear");
    setHistory([]);
    setFinalTranslation("");
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

          <div className="mt-4 flex flex-wrap gap-3 items-center">
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

            {/* HISTORIAL DE PALABRAS (solo mientras corre) */}
            {running && history.length > 0 && (
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-600 truncate">
                  {history.map((h, i) => (
                    <span key={i}>
                      {i > 0 && " → "}
                      <span className="font-medium text-slate-800">
                        {h.split(" (")[0]}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-slate-500">
              Backend: {backendAlive === null ? "..." : backendAlive ? "Conectado" : "Desconectado"}
            </div>
          </div>
        </div>

        {/* Resultado */}
        <div className="bg-white rounded-2xl shadow-soft p-4 border">
          <div className="text-sm font-semibold text-slate-700 mb-2">Traducción final</div>
          <div className="min-h-[200px] rounded-xl border bg-slate-50 p-4 text-slate-700 text-lg font-medium">
            {finalTranslation ? (
              <div className="text-green-600 font-bold">{finalTranslation}</div>
            ) : (
              <div className="text-slate-500 italic">
                {running ? "Detectando..." : "Presiona 'Iniciar' para comenzar"}
              </div>
            )}
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            * Traducción refinada con T5 + Gemini (LSB → Español Boliviano)
          </div>
        </div>
      </div>
    </div>
  );
}