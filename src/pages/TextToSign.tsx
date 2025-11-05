import { useRef, useState, useEffect } from "react";

const API_URL = "http://127.0.0.1:8005/animar";

interface AnimationResponse {
  frames: string[];
  fps: number;
  glosa_final: string;
  tokens: string[];
  total_frames: number;
}

export default function TextToSign() {
  const [text, setText] = useState("");
  const [latency, setLatency] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [glosa, setGlosa] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const framesRef = useRef<string[]>([]);
  const frameIndexRef = useRef(0);
  const fpsRef = useRef(24);

  async function handleGenerate() {
    if (!text.trim() || isPlaying) return;

    setIsPlaying(true);
    setGlosa("");
    const t0 = performance.now();

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frase: text.trim() }),
      });

      const data: AnimationResponse = await res.json();
      const t1 = performance.now();

      if (!res.ok || !data.frames) {
        alert("Error: " + (data as any).error);
        return;
      }

      setLatency(Math.round(t1 - t0));
      setGlosa(data.glosa_final);
      framesRef.current = data.frames;
      frameIndexRef.current = 0;
      fpsRef.current = data.fps || 24;

      animate();
    } catch (err) {
      alert("Error de conexión");
      console.error(err);
    } finally {
      setIsPlaying(false);
    }
  }

  function animate() {
    const canvas = canvasRef.current;
    if (!canvas || framesRef.current.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const base64 = framesRef.current[frameIndexRef.current];
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      frameIndexRef.current++;
      if (frameIndexRef.current < framesRef.current.length) {
        const delay = 1000 / fpsRef.current;
        setTimeout(() => {
          animationRef.current = requestAnimationFrame(animate);
        }, delay);
      } else {
        setIsPlaying(false);
      }
    };
    img.src = `data:image/jpeg;base64,${base64}`;
  }

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const clearAll = () => {
    setText("");
    setGlosa("");
    setLatency(null);
    setIsPlaying(false);
    framesRef.current = [];
    frameIndexRef.current = 0;
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, 640, 480);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 p-4 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 border">
        <h3 className="text-lg font-bold text-slate-800 mb-3">Texto en Español</h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe una frase..."
          className="w-full h-32 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          disabled={isPlaying}
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={!text.trim() || isPlaying}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isPlaying ? "Generando..." : "Animar en LSB"}
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-2 bg-gray-200 rounded-xl hover:bg-gray-300 transition"
          >
            Limpiar
          </button>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          {latency && `Latencia: ${latency} ms`}
          {isPlaying && " | Reproduciendo..."}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border">
        <h3 className="text-lg font-bold text-slate-800 mb-3">Animación LSB</h3>
        <div className="bg-white rounded-xl overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full h-auto block bg-white"
          />
        </div>
        {glosa && (
          <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-mono text-amber-900">
              <strong>Glosa:</strong> {glosa}
            </p>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500 text-center">
          Animación generada en el backend y transmitida al frontend
        </p>
      </div>
    </div>
  );
}