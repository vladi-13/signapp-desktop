import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

function dataURLtoBase64(dataURL: string) {
  return dataURL.split(",")[1] || "";
}

export default function CameraSTT() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: { ideal: 30 } }, audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    })();
    return () => {
      const v = videoRef.current;
      if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, []);

  async function captureAndSend() {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    c.width = v.videoWidth; c.height = v.videoHeight;

    const frames: string[] = [];
    for (let i = 0; i < 24; i++) { // ~1s
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const dataURL = c.toDataURL("image/jpeg", 0.7);
      frames.push(dataURLtoBase64(dataURL));
      await new Promise(r => setTimeout(r, 1000 / 24));
    }

    const t0 = performance.now();
    const { ok, data, error } = await api.signToText(frames);
    const t1 = performance.now();

    if (ok && data) {
      setTranscript(data.text ?? "");
      setLatency(data.latency_ms ?? Math.round(t1 - t0));
    } else {
      setTranscript(""); setLatency(null);
      alert("Error en sign-to-text: " + (error || "desconocido"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-soft p-4 border">
          <div className="text-sm font-semibold text-slate-700 mb-2">Cámara</div>
          <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={async () => { setRunning(true); await captureAndSend(); setRunning(false); }}
              disabled={running}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {running ? "Procesando..." : "Capturar y transcribir"}
            </button>
            <button
              onClick={() => { setTranscript(""); setLatency(null); }}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300"
            >
              Limpiar
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-4 border">
          <div className="text-sm font-semibold text-slate-700 mb-2">Transcripción</div>
          <div className="min-h-[200px] rounded-xl border bg-slate-50 p-4 text-slate-700">
            {transcript || <span className="text-slate-400">Sin resultados todavía…</span>}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            {latency != null ? `Latencia: ${latency} ms` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
