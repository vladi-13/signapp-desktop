import { useEffect, useState } from "react";
import { NavTabs } from "./components/NavTabs";
import CameraSTT from "./pages/CameraSTT";
import TextToSign from "./pages/TextToSign";
import Settings from "./pages/Settings";
import { api } from "./api/client";
import { StatusBar } from "./components/StatusBar";

type TabID = "camera" | "t2s" | "settings";

export default function App() {
  const [active, setActive] = useState<TabID>("camera");
  const [online, setOnline] = useState(false);
  const [device, setDevice] = useState<string | undefined>(undefined);
  const [msg, setMsg] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { ok, data } = await api.health();
      if (!mounted) return;
      setOnline(!!ok && !!data?.ok);
      setDevice(data?.device);
      if (!ok) setMsg("No se pudo contactar el backend. Funciona en modo demo.");
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
              Σ
            </div>
            <div>
              <div className="font-semibold text-slate-800 leading-none">SignApp</div>
              <div className="text-xs text-slate-500 leading-none">Demo UI · Tauri + React</div>
            </div>
          </div>

          <NavTabs
            tabs={[
              { id: "camera", label: "Cámara → Texto" },
              { id: "t2s", label: "Texto → Animación" },
              { id: "settings", label: "Ajustes" },
            ]}
            active={active}
            onChange={(id) => setActive(id as TabID)}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {active === "camera" && <CameraSTT />}
        {active === "t2s" && <TextToSign />}
        {active === "settings" && <Settings />}
      </main>

      <StatusBar online={online} device={device} message={msg} />
    </div>
  );
}
