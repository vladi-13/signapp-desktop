import { useRef, useState } from "react";
import { api } from "../api/client";

export default function TextToSign() {
  const [text, setText] = useState("");
  const [latency, setLatency] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function handleGenerate() {
    if (!text.trim()) return;
    const t0 = performance.now();
    const { ok, data, error } = await api.textToSign(text.trim());
    const t1 = performance.now();

    if (!ok || !data) { alert("Error en text-to-sign: " + (error || "desconocido")); return; }
    setLatency(data.latency_ms ?? Math.round(t1 - t0));

    // Demo de dibujo; reemplaza cuando tengas poses
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = "#0ea5e9";
    ctx.beginPath(); ctx.arc(150, 80, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(140, 110, 20, 60);
    ctx.fillRect(110, 110, 30, 10); ctx.fillRect(160, 110, 30, 10);
    ctx.fillRect(145, 170, 8, 30);  ctx.fillRect(157, 170, 8, 30);
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-soft p-4 border">
        <div className="text-sm font-semibold text-slate-700 mb-2">Entrada</div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escribe el texto aquí…"
          className="w-full h-40 rounded-xl border p-3 outline-none focus:ring-2 focus:ring-brand-400"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleGenerate}
            className="px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700"
          >
            Generar animación
          </button>
          <button
            onClick={() => setText("")}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300"
          >
            Limpiar
          </button>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          {latency != null ? `Latencia: ${latency} ms` : ""}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft p-4 border">
        <div className="text-sm font-semibold text-slate-700 mb-2">Vista previa</div>
        <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
          <canvas ref={canvasRef} width={300} height={220} />
        </div>
        <div className="mt-2 text-xs text-slate-500">
          (Aquí renderizarás tus poses/cuaterniones/frames cuando el backend los devuelva)
        </div>
      </div>
    </div>
  );
}
