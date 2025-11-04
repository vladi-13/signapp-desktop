// src/pages/CameraSTT.tsx
import { useEffect, useRef, useState } from "react";

export default function CameraSTT() {
  const [transcript, setTranscript] = useState<React.ReactNode>("Pausado");
  const [frame, setFrame] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [backendAlive, setBackendAlive] = useState<boolean | null>(null);
  const [finalTranslation, setFinalTranslation] = useState<string>("");

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
      setFinalTranslation("");
      return;
    }

    let stop = false;
    const poll = async () => {
      while (!stop && runningRef.current) {
        try {
          const res = await fetch("http://127.0.0.1:8000/current");
          const data = await res.json();

          // --- SEÑA ACTUAL + % ---
          const cleanText = data.current?.clean_text || "Pausado";
          const probPercent = data.current?.prob_percent || "0.0%";
          const isHigh = (data.current?.prob || 0) >= 0.7;

          setTranscript(
            <span>
              <span className="font-bold">{cleanText}</span>{" "}
              <span className={isHigh ? "text-green-600" : "text-orange-600"}>
                ({probPercent})
              </span>
            </span>
          );

          // --- FRAME ---
          setFrame(data.frame ? `data:image/jpeg;base64,${data.frame}` : "");

          // --- HISTORIAL: Usar el string ya formateado ---
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
      const data = await res.json();
      setFinalTranslation(data.traduccion_refinada || "No se detectó nada.");
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
          <div className="text-sm font-semibold text-slate-700 mb-2">
            Cámara (procesada por backend)
          </div>
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

            {/* HISTORIAL (solo mientras corre) */}
            {running && history.length > 0 && (
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-600 truncate">
                  {history.map((h, i) => {
                    const [word, prob] = h.split(" (");
                    const probValue = parseFloat(prob?.replace("%)", "") || "0");
                    const isHigh = probValue >= 70;
                    return (
                      <span key={i}>
                        {i > 0 && " → "}
                        <span className={`font-medium ${isHigh ? "text-green-600" : "text-orange-600"}`}>
                          {word.replace("_recortados_auto", "")}
                        </span>
                        <span className="text-slate-500"> ({prob}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="text-xs text-slate-500">
              Backend: {backendAlive === null ? "..." : backendAlive ? "Conectado" : "Desconectado"}
            </div>
          </div>

          {/* SEÑA ACTUAL EN GRANDE */}
          <div className="mt-4 p-3 bg-slate-50 rounded-xl text-center">
            <div className="text-sm text-slate-600 mb-1">Seña detectada</div>
            <div className="text-xl font-bold text-slate-800">
              {transcript}
            </div>
          </div>
        </div>

        {/* Resultado */}
        <div className="bg-white rounded-2xl shadow-soft p-4 border">
          <div className="text-sm font-semibold text-slate-700 mb-2">
            Traducción final
          </div>
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