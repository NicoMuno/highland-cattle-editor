import React from "react";

export type SidebarNavItem<TTab extends string> = {
  id: TTab;
  label: string;
  icon: string;
  disabled?: boolean;
};

type EditorDropdown<TEditorId extends string> = {
  enabled: boolean;
  isOpen: boolean;
  selected: TEditorId;
  options: { id: TEditorId; label: string }[];
  onSelect: (id: TEditorId) => void;
};

type SidebarProps<TTab extends string, TEditorId extends string = string> = {
  appName?: string;
  subtitle?: string;
  editorDropdown?: EditorDropdown<TEditorId>;

  activeTab: TTab;
  onTabChange: (tab: TTab) => void;
  navItems: SidebarNavItem<TTab>[];

  statusLabel?: string;
  statusDotClassName?: string;

  settingsTabId?: TTab;
};

export default function Sidebar<TTab extends string, TEditorId extends string = string>({
  appName = "FarmEdit",
  subtitle = "Desktop Editor",
  activeTab,
  onTabChange,
  navItems,
  statusLabel = "Ready",
  statusDotClassName = "bg-emerald-500 animate-pulse",
  editorDropdown,
  settingsTabId,
}: SidebarProps<TTab, TEditorId>) {
  const isSettingsActive = !!settingsTabId && activeTab === settingsTabId;

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="bg-emerald-500 p-2 rounded-lg">
          <span className="material-symbols-outlined text-white">agriculture</span>
        </div>
        <div>
          <h1 className="font-bold tracking-tight text-lg">{appName}</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            {subtitle}
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const disabled = !!item.disabled;

          const isEditorItem = item.id === ("editor" as TTab);
          const showDropdown = isEditorItem && editorDropdown?.enabled;

          return (
            <div key={item.id} className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  if (!disabled) onTabChange(item.id);
                }}
                disabled={disabled}
                className={[
                  "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800",
                  disabled ? "opacity-30 cursor-not-allowed" : "",
                ].join(" ")}
              >
                <span className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  {item.label}
                </span>

                {showDropdown && (
                  <span className="material-symbols-outlined text-base opacity-80">
                    {editorDropdown?.isOpen ? "expand_less" : "expand_more"}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {showDropdown && editorDropdown?.isOpen && (
                <div className="ml-4 pl-3 border-l border-slate-800 space-y-1">
                  {editorDropdown.options.map((opt) => {
                    const selected = editorDropdown.selected === opt.id;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => editorDropdown.onSelect(opt.id)}
                        className={[
                          "w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-all",
                          selected
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/60",
                        ].join(" ")}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {selected ? "radio_button_checked" : "radio_button_unchecked"}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-slate-800">
        <div className="flex items-stretch gap-3">
          {/* Status card */}
          <div className="flex-1 bg-slate-800/50 rounded-xl p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
              Status
            </p>
            <div className="flex items-center gap-2">
              <div className={`size-2 rounded-full ${statusDotClassName}`} />
              <span className="text-xs font-medium">{statusLabel}</span>
            </div>
          </div>

          {/* Settings icon-only button */}
          {settingsTabId && (
            <button
              type="button"
              onClick={() => onTabChange(settingsTabId)}
              className={[
                "shrink-0 w-12 rounded-xl border transition-colors flex items-center justify-center",
                isSettingsActive
                  ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20"
                  : "bg-slate-800/50 border-slate-800 hover:bg-slate-800",
              ].join(" ")}
              title="Settings"
              aria-label="Settings"
            >
              <span
                className={[
                  "material-symbols-outlined",
                  isSettingsActive ? "text-white" : "text-slate-200",
                ].join(" ")}
              >
                settings
              </span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}