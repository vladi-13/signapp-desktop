import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Settings() {
  const [online, setOnline] = useState(false);
  const [device, setDevice] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const { ok, data } = await api.health();
      setOnline(!!ok && !!data?.ok);
      setDevice(data?.device);
    })();
  }, []);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-soft p-4 border">
        <div className="text-sm font-semibold text-slate-700 mb-2">Estado del backend</div>
        <div className="text-sm text-slate-600">
          {online ? "Conectado ✅" : "Desconectado ❌"}
          {device ? ` · Dispositivo: ${device}` : ""}
        </div>
        <div className="mt-3 text-xs text-slate-500">
          Asegúrate de tener el backend (FastAPI) ejecutándose si deseas inferencia real.
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft p-4 border">
        <div className="text-sm font-semibold text-slate-700 mb-2">Preferencias</div>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Cap FPS en cámara</span>
            <select className="border rounded-lg px-2 py-1">
              <option>30</option><option>24</option><option>15</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span>Calidad de captura</span>
            <select className="border rounded-lg px-2 py-1">
              <option>Alta</option><option>Media</option><option>Baja</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
