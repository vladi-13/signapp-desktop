export function StatusBar({
  online, device, message,
}: { online: boolean; device?: string; message?: string }) {
  return (
    <div className="fixed bottom-4 left-4 right-4">
      <div className="mx-auto max-w-5xl bg-white/90 backdrop-blur rounded-2xl shadow-soft border p-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            className={
              "inline-block h-3 w-3 rounded-full " +
              (online ? "bg-emerald-500" : "bg-rose-500")
            }
            title={online ? "Conectado" : "Desconectado"}
          />
          <span className="text-sm text-slate-600">
            {online ? "Backend listo" : "Backend no disponible"}
            {device ? ` · Dispositivo: ${device}` : ""}
          </span>
        </div>
        {message ? <div className="text-sm text-slate-500">{message}</div> : null}
      </div>
    </div>
  );
}
