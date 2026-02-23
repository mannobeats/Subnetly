"use client";

import {
  ArrowRight,
  Box,
  Globe,
  Network,
  Search,
  Server,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface SearchResult {
  id: string;
  type: "device" | "subnet" | "vlan" | "wifi" | "service" | "ip";
  title: string;
  subtitle: string;
  view: string;
  icon: React.ElementType;
  color: string;
}

interface CommandPaletteProps {
  onNavigate: (view: string, itemId?: string) => void;
}

const CommandPalette = ({ onNavigate }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [allData, setAllData] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all searchable data when palette opens
  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/devices").then((r) => r.json()),
      fetch("/api/subnets").then((r) => r.json()),
      fetch("/api/vlans").then((r) => r.json()),
      fetch("/api/wifi").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ]).then(([devices, subnets, vlans, wifi, services]) => {
      const items: SearchResult[] = [];
      if (Array.isArray(devices)) {
        devices.forEach(
          (d: {
            id: string;
            name: string;
            ipAddress: string;
            category: string;
            status: string;
          }) => {
            items.push({
              id: d.id,
              type: "device",
              title: d.name,
              subtitle: `${d.ipAddress || "No IP"} \u00b7 ${d.category} \u00b7 ${d.status}`,
              view: "devices",
              icon: Server,
              color: "#3366ff",
            });
          },
        );
      }
      if (Array.isArray(subnets)) {
        subnets.forEach(
          (s: {
            id: string;
            prefix: string;
            mask: number;
            description?: string;
            gateway?: string;
          }) => {
            items.push({
              id: s.id,
              type: "subnet",
              title: `${s.prefix}/${s.mask}`,
              subtitle: s.description || s.gateway || "Subnet",
              view: "ipam",
              icon: Globe,
              color: "#10b981",
            });
          },
        );
      }
      if (Array.isArray(vlans)) {
        vlans.forEach(
          (v: { id: string; vid: number; name: string; role?: string }) => {
            items.push({
              id: v.id,
              type: "vlan",
              title: `VLAN ${v.vid} \u2014 ${v.name}`,
              subtitle: v.role || "VLAN",
              view: "vlans",
              icon: Network,
              color: "#7c3aed",
            });
          },
        );
      }
      if (Array.isArray(wifi)) {
        wifi.forEach(
          (w: { id: string; ssid: string; security: string; band: string }) => {
            items.push({
              id: w.id,
              type: "wifi",
              title: w.ssid,
              subtitle: `${w.security} \u00b7 ${w.band}`,
              view: "wifi",
              icon: Wifi,
              color: "#06b6d4",
            });
          },
        );
      }
      if (Array.isArray(services)) {
        services.forEach(
          (s: {
            id: string;
            name: string;
            protocol: string;
            ports: string;
            device?: { name: string };
          }) => {
            items.push({
              id: s.id,
              type: "service",
              title: s.name,
              subtitle: `${s.protocol.toUpperCase()}:${s.ports} ${s.device ? `\u00b7 ${s.device.name}` : ""}`,
              view: "services",
              icon: Box,
              color: "#f97316",
            });
          },
        );
      }
      setAllData(items);
    });
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return allData.slice(0, 12);
    const q = query.toLowerCase();
    return allData
      .filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.subtitle.toLowerCase().includes(q) ||
          r.type.includes(q),
      )
      .slice(0, 12);
  }, [query, allData]);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            setQuery("");
            setSelectedIdx(0);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
          return !prev;
        });
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleSelect = (result: SearchResult) => {
    onNavigate(result.view, result.id);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      handleSelect(results[selectedIdx]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-9999 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="w-[560px] max-h-[480px] bg-card rounded-[14px] shadow-[0_24px_80px_rgba(0,0,0,0.25)] overflow-hidden border border-border">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
          <Search size={18} className="text-(--text-light)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search devices, subnets, VLANs, WiFi, services..."
            className="flex-1 border-none outline-none text-[15px] bg-transparent text-foreground"
          />
          <kbd className="text-[10px] px-1.5 py-px rounded bg-(--muted-bg) text-(--text-light) border border-border">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="p-8 text-center text-(--text-light) text-[13px]">
              {query ? "No results found" : "Loading..."}
            </div>
          ) : (
            <>
              {!query && (
                <div className="px-3 pt-1 pb-2 text-[10px] font-semibold text-(--text-light) uppercase tracking-wide">
                  Quick Jump
                </div>
              )}
              {results.map((r, i) => {
                const Icon = r.icon;
                return (
                  <button
                    type="button"
                    key={`${r.type}-${r.id}`}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${i === selectedIdx ? "bg-(--muted-bg-alt)" : "bg-transparent"}`}
                    onMouseEnter={() => setSelectedIdx(i)}
                    onFocus={() => setSelectedIdx(i)}
                    onClick={() => handleSelect(r)}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${r.color}12`, color: r.color }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[13px] truncate">
                        {r.title}
                      </div>
                      <div className="text-[11px] text-(--text-light) truncate">
                        {r.subtitle}
                      </div>
                    </div>
                    <span className="text-[10px] text-(--text-light) capitalize bg-(--muted-bg) px-1.5 py-px rounded shrink-0">
                      {r.type}
                    </span>
                    <ArrowRight size={12} className="text-border" />
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex gap-4 justify-center text-[10px] text-(--text-light)">
          <span>
            <kbd className="px-1 py-px rounded bg-(--muted-bg) border border-border mr-1">
              &uarr;&darr;
            </kbd>{" "}
            Navigate
          </span>
          <span>
            <kbd className="px-1 py-px rounded bg-(--muted-bg) border border-border mr-1">
              Enter
            </kbd>{" "}
            Open
          </span>
          <span>
            <kbd className="px-1 py-px rounded bg-(--muted-bg) border border-border mr-1">
              Esc
            </kbd>{" "}
            Close
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
