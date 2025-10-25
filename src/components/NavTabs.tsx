type Tab = { id: string; label: string };

export function NavTabs({
  tabs, active, onChange,
}: { tabs: Tab[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-2xl p-1 shadow-soft border">
      {tabs.map((t) => {
        const isActive = active === t.id;
        const base =
          "px-4 py-2 rounded-xl text-sm font-medium transition";
        const activeCls = "bg-brand-600 text-white shadow";
        const idleCls = "text-slate-600 hover:bg-slate-100";
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`${base} ${isActive ? activeCls : idleCls}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
