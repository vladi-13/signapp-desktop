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
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesLoaded = useRef(false);

  // === CARGAR VOCES AL INICIO ===
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
      voicesLoaded.current = true;
    };

    // Algunas veces las voces no están listas al inicio
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // === FUNCIÓN PARA LEER TEXTO CON PAUSAS ===
  const leerTexto = (texto: string) => {
    // Cancelar lectura anterior
    window.speechSynthesis.cancel();
    utteranceRef.current = null;

    if (!texto.trim()) return;

    // Dividir en oraciones para pausas naturales
    const oraciones = texto
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + ".");

    let delay = 0;
    const rate = 0.9;
    const pitch = 1;

    oraciones.forEach((oracion, index) => {
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(oracion);
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.lang = "es-BO";

        // Buscar voz boliviana → española → cualquier español
        const voices = window.speechSynthesis.getVoices();
        const vozPreferida =
          voices.find(v => v.lang === "es-BO") ||
          voices.find(v => v.lang.startsWith("es") && v.name.includes("Bolivia")) ||
          voices.find(v => v.lang.startsWith("es"));

        if (vozPreferida) utterance.voice = vozPreferida;

        utterance.onend = () => {
          if (index === oraciones.length - 1) {
            utteranceRef.current = null;
          }
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }, delay);

      // Pausa entre oraciones (ajustable)
      delay += oracion.length * 35 + 600;
    });
  };

  // === LEER AUTOMÁTICAMENTE CUANDO CAMBIE finalTranslation ===
  useEffect(() => {
    if (finalTranslation && finalTranslation.trim()) {
      // Pequeño retraso para asegurar que el DOM esté listo
      setTimeout(() => leerTexto(finalTranslation), 300);
    }
  }, [finalTranslation]);

  // === HEALTH CHECK ===
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

  // === POLLING ===
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

  // === TOGGLE START/STOP ===
  const toggle = async () => {
    const next = !running;
    setRunning(next);
    runningRef.current = next;

    const endpoint = next ? "start" : "stop";
    const res = await fetch(`http://127.0.0.1:8000/${endpoint}`);

    if (!next) {
      try {
        const data = await res.json();
        setFinalTranslation(data.traduccion_refinada || "No se detectó nada.");
      } catch {
        setFinalTranslation("Error al obtener traducción.");
      }
    }
  };

  // === LIMPIAR ===
  const clear = async () => {
    await fetch("http://127.0.0.1:8000/clear");
    setHistory([]);
    setFinalTranslation("");
    window.speechSynthesis.cancel();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="grid md:grid-cols-2 gap-6">
        {/* === VIDEO + CONTROLES === */}
        <div className="bg-white rounded-2xl shadow-soft p-4 border">
          <div className="text-sm font-semibold text-slate-700 mb-2">
            Cámara (procesada por backend)
          </div>
          <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
            {frame ? (
              <img src={frame} className="w-full h-full object-cover" alt="Frame en vivo" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                Sin señal
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <button
              onClick={toggle}
              className={`px-4 py-2 rounded-xl text-white font-medium transition ${
                running ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700"
              }`}
            >
              {running ? "Detener" : "Iniciar"}
            </button>
            <button
              onClick={clear}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 transition"
            >
              Limpiar
            </button>

            {/* HISTORIAL EN VIVO */}
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

          {/* SEÑA ACTUAL */}
          <div className="mt-4 p-3 bg-slate-50 rounded-xl text-center">
            <div className="text-sm text-slate-600 mb-1">Seña detectada</div>
            <div className="text-xl font-bold text-slate-800">
              {transcript}
            </div>
          </div>
        </div>

        {/* === RESULTADO + LECTURA === */}
        <div className="bg-white rounded-2xl shadow-soft p-4 border">
          <div className="text-sm font-semibold text-slate-700 mb-2">
            Traducción final
          </div>
          <div className="min-h-[200px] rounded-xl border bg-slate-50 p-4 text-slate-700 text-lg font-medium relative">
            {finalTranslation ? (
              <div className="text-green-600 font-bold pr-12 break-words">
                {finalTranslation}
              </div>
            ) : (
              <div className="text-slate-500 italic">
                {running ? "Detectando..." : "Presiona 'Iniciar' para comenzar"}
              </div>
            )}

            {/* BOTÓN REPETIR LECTURA */}
            {finalTranslation && (
              <button
                onClick={() => leerTexto(finalTranslation)}
                className="absolute bottom-3 right-3 p-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition transform hover:scale-110"
                title="Repetir lectura"
                aria-label="Repetir lectura en voz alta"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586m4.707-4.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 12l1.172-1.172a1 1 0 000-1.414z"
                  />
                </svg>
              </button>
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