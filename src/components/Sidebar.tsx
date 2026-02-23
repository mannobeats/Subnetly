"use client";

import {
  Bell,
  Box,
  ChevronDown,
  Command,
  Database,
  Globe,
  History,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Network,
  Plus,
  Search,
  Server,
  Settings,
  Share2,
  Shield,
  Tag,
  User,
  Wifi,
} from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getCategoryIcon } from "@/lib/category-icons";
import type { CustomCategory, Site } from "@/types";

export type ViewType =
  | "dashboard"
  | "devices"
  | "ipam"
  | "vlans"
  | "wifi"
  | "topology"
  | "services"
  | "changelog"
  | "settings";

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedVlanRole: string | null;
  setSelectedVlanRole: (role: string | null) => void;
  selectedIpFilter: string | null;
  setSelectedIpFilter: (filter: string | null) => void;
  selectedServiceFilter: string | null;
  setSelectedServiceFilter: (filter: string | null) => void;
  selectedChangelogFilter: string | null;
  setSelectedChangelogFilter: (filter: string | null) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  settingsTab?: string;
  setSettingsTab?: (tab: string) => void;
  sites?: Site[];
  activeSiteId?: string | null;
  onSwitchSite?: (siteId: string) => void;
  onCreateSite?: (name: string) => void;
  categories?: CustomCategory[];
  vlanRoles?: CustomCategory[];
  serviceProtocols?: CustomCategory[];
  wifiSecurities?: CustomCategory[];
  ipAddressTypes?: CustomCategory[];
}

const navItems: { id: ViewType; icon: React.ElementType; label: string }[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "devices", icon: Server, label: "Devices" },
  { id: "ipam", icon: Globe, label: "IP Planner" },
  { id: "vlans", icon: Network, label: "VLANs" },
  { id: "wifi", icon: Wifi, label: "WiFi" },
  { id: "topology", icon: Share2, label: "Topology" },
  { id: "services", icon: Box, label: "Services" },
  { id: "changelog", icon: History, label: "Changelog" },
];

const Sidebar = ({
  activeView,
  setActiveView,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedVlanRole,
  setSelectedVlanRole,
  selectedIpFilter,
  setSelectedIpFilter,
  selectedServiceFilter,
  setSelectedServiceFilter,
  selectedChangelogFilter,
  setSelectedChangelogFilter,
  searchInputRef,
  userName,
  userEmail,
  onLogout,
  settingsTab,
  setSettingsTab,
  sites = [],
  activeSiteId,
  onSwitchSite,
  onCreateSite,
  categories = [],
  vlanRoles = [],
  serviceProtocols = [],
  wifiSecurities = [],
  ipAddressTypes = [],
}: SidebarProps) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [siteMenuOpen, setSiteMenuOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);
  const siteMenuRef = useRef<HTMLDivElement>(null);

  const activeSite = sites.find((s) => s.id === activeSiteId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
      if (
        siteMenuRef.current &&
        !siteMenuRef.current.contains(e.target as Node)
      ) {
        setSiteMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
    : "?";
  return (
    <>
      {/* Primary Sidebar - Icons Only */}
      <div className="w-(--sidebar-w) h-full bg-(--surface) border-r border-border flex flex-col items-center py-4 gap-6 z-100">
        <div className="w-9 h-9 flex items-center justify-center text-(--blue) mb-2">
          <Wifi size={22} strokeWidth={2.5} />
        </div>
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`w-9 h-9 flex items-center justify-center cursor-pointer rounded-[10px] transition-all duration-200 ${activeView === item.id ? "text-(--blue) bg-(--blue-bg)" : "text-(--text-muted) hover:bg-(--hover) hover:text-(--blue)"}`}
            onClick={() => setActiveView(item.id)}
            title={item.label}
          >
            <item.icon size={18} />
          </div>
        ))}
        <div className="flex-1" />
        <div
          className={`w-9 h-9 flex items-center justify-center cursor-pointer rounded-[10px] transition-all duration-200 ${activeView === "settings" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text-muted) hover:bg-(--hover) hover:text-(--blue)"}`}
          title="Settings"
          onClick={() => setActiveView("settings")}
        >
          <Settings size={18} />
        </div>
        <div className="relative" ref={userMenuRef}>
          <button
            className="w-8 h-8 rounded-full bg-linear-to-br from-(--blue) to-(--blue-light) text-white flex items-center justify-center cursor-pointer text-xs font-bold border-none transition-all duration-200 uppercase hover:scale-110 hover:shadow-[0_2px_8px_var(--blue-ring)]"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            title={userName || "User"}
          >
            {initials}
          </button>
          {userMenuOpen && (
            <div className="fixed bottom-3 left-14 bg-(--surface) border border-border rounded-lg shadow-(--shadow-popup) min-w-[220px] p-2 z-1000 animate-fade-in">
              <div className="px-3 py-3 border-b border-border mb-1">
                <div className="text-[13px] font-semibold text-(--text)">
                  {userName || "User"}
                </div>
                <div className="text-[11px] text-(--text-muted) mt-0.5">
                  {userEmail || ""}
                </div>
              </div>
              <button
                className="flex items-center gap-3 px-3 py-2 text-[13px] text-(--text) cursor-pointer rounded border-none bg-transparent w-full text-left transition-all duration-150 hover:bg-(--hover) hover:text-(--blue)"
                onClick={() => {
                  setActiveView("settings");
                  setUserMenuOpen(false);
                }}
              >
                <User size={14} /> Profile
              </button>
              <button
                className="flex items-center gap-3 px-3 py-2 text-[13px] text-(--text) cursor-pointer rounded border-none bg-transparent w-full text-left transition-all duration-150 hover:bg-(--hover) hover:text-(--blue)"
                onClick={() => {
                  setActiveView("settings");
                  setUserMenuOpen(false);
                }}
              >
                <Settings size={14} /> Settings
              </button>
              <div className="h-px bg-border my-1" />
              <button
                className="flex items-center gap-3 px-3 py-2 text-[13px] text-(--red) cursor-pointer rounded border-none bg-transparent w-full text-left transition-all duration-150 hover:bg-(--red-bg)"
                onClick={() => {
                  setUserMenuOpen(false);
                  onLogout?.();
                }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Sidebar - Context Panel */}
      <div className="w-(--sidebar2-w) h-full bg-(--surface) border-r border-border flex flex-col p-6 overflow-y-auto">
        {/* Site Switcher */}
        {sites.length > 0 && (
          <div className="relative mb-4" ref={siteMenuRef}>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-(--surface) cursor-pointer text-[13px] font-medium text-(--text) transition-all duration-150 hover:border-(--blue) hover:bg-(--blue-bg)"
              onClick={() => setSiteMenuOpen(!siteMenuOpen)}
            >
              <MapPin size={14} />
              <span className="flex-1 text-left truncate">
                {activeSite?.name || "Select Site"}
              </span>
              <ChevronDown
                size={12}
                className={`opacity-50 transition-transform duration-150 ${siteMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {siteMenuOpen && (
              <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-(--surface) border border-border rounded-lg shadow-(--shadow-popup) z-100 overflow-hidden animate-fade-in">
                {sites.map((s) => (
                  <button
                    key={s.id}
                    className={`w-full flex items-center gap-2 px-3 py-2 border-none bg-transparent cursor-pointer text-xs text-(--text) text-left transition-colors duration-100 hover:bg-(--hover) ${s.id === activeSiteId ? "bg-(--blue-bg) text-(--blue)" : ""}`}
                    onClick={() => {
                      onSwitchSite?.(s.id);
                      setSiteMenuOpen(false);
                    }}
                  >
                    <MapPin size={12} />
                    <div className="flex-1">
                      <div className="font-medium">{s.name}</div>
                      {s._count && (
                        <div className="text-[10px] text-(--text-light)">
                          {s._count.devices} devices · {s._count.subnets}{" "}
                          subnets
                        </div>
                      )}
                    </div>
                  </button>
                ))}
                <div className="border-t border-border my-1 p-1">
                  <div className="flex gap-1">
                    <input
                      className="w-full h-7 border border-border rounded bg-(--surface-alt) text-(--text) text-[11px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface) flex-1"
                      placeholder="New site name..."
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSiteName.trim()) {
                          onCreateSite?.(newSiteName.trim());
                          setNewSiteName("");
                          setSiteMenuOpen(false);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      disabled={!newSiteName.trim()}
                      onClick={() => {
                        if (newSiteName.trim()) {
                          onCreateSite?.(newSiteName.trim());
                          setNewSiteName("");
                          setSiteMenuOpen(false);
                        }
                      }}
                    >
                      <Plus size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-sm font-semibold mb-5 text-(--text)">
          {activeView === "settings"
            ? "Settings"
            : navItems.find((n) => n.id === activeView)?.label}
        </div>

        <div className="relative mb-6">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={14}
          />
          <input
            ref={searchInputRef}
            type="text"
            className="w-full h-8 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] pl-8! pr-10! focus:outline-none focus:border-(--blue) focus:bg-(--surface)"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {!searchTerm && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-(--text-light) text-[10px] pointer-events-none">
              <Command size={10} /> K
            </span>
          )}
        </div>

        {activeView === "devices" && (
          <>
            <h3>Filters</h3>
            <div className="flex flex-col gap-1 mb-6">
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedCategory === null ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSelectedCategory(null)}
              >
                <Server
                  size={14}
                  color={selectedCategory === null ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>All Devices</span>
              </div>
            </div>
            <h3>Categories</h3>
            <div className="flex flex-col gap-1">
              {categories.length > 0 ? (
                categories.map((cat) => {
                  const Icon = getCategoryIcon(cat.icon);
                  return (
                    <div
                      key={cat.id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedCategory === cat.name ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                      onClick={() =>
                        setSelectedCategory(
                          selectedCategory === cat.name ? null : cat.name,
                        )
                      }
                    >
                      <Icon
                        size={14}
                        color={
                          selectedCategory === cat.name ? "#3366ff" : cat.color
                        }
                      />{" "}
                      <span>{cat.name}</span>
                    </div>
                  );
                })
              ) : (
                <>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedCategory === "Server" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() => setSelectedCategory("Server")}
                  >
                    <Server
                      size={14}
                      color={
                        selectedCategory === "Server" ? "#3366ff" : "#5e6670"
                      }
                    />{" "}
                    <span>Servers</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedCategory === "Networking" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() => setSelectedCategory("Networking")}
                  >
                    <Network
                      size={14}
                      color={
                        selectedCategory === "Networking"
                          ? "#3366ff"
                          : "#5e6670"
                      }
                    />{" "}
                    <span>Networking</span>
                  </div>
                </>
              )}
            </div>
            {categories.length > 0 && (
              <div className="mt-3">
                <div
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 text-[11px] text-(--text-light) hover:text-(--blue) hover:bg-(--hover)"
                  onClick={() => {
                    setSettingsTab?.("categories");
                    setActiveView("settings");
                  }}
                >
                  <Tag size={12} /> <span>Manage Categories</span>
                </div>
              </div>
            )}
          </>
        )}

        {activeView === "dashboard" && (
          <>
            <h3>Quick Navigation</h3>
            <div className="flex flex-col gap-1">
              <div
                className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 text-(--text) hover:text-(--blue) hover:bg-(--hover)"
                onClick={() => setActiveView("devices")}
              >
                <Server size={14} color="#5e6670" /> <span>Devices</span>
              </div>
              <div
                className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 text-(--text) hover:text-(--blue) hover:bg-(--hover)"
                onClick={() => setActiveView("ipam")}
              >
                <Globe size={14} color="#5e6670" /> <span>IP Planner</span>
              </div>
              <div
                className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 text-(--text) hover:text-(--blue) hover:bg-(--hover)"
                onClick={() => setActiveView("vlans")}
              >
                <Network size={14} color="#5e6670" /> <span>VLANs</span>
              </div>
              <div
                className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 text-(--text) hover:text-(--blue) hover:bg-(--hover)"
                onClick={() => setActiveView("topology")}
              >
                <Share2 size={14} color="#5e6670" /> <span>Topology</span>
              </div>
            </div>
          </>
        )}

        {activeView === "ipam" && (
          <>
            <h3>Filters</h3>
            <div className="flex flex-col gap-1 mb-6">
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedIpFilter === null ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSelectedIpFilter(null)}
              >
                <Globe
                  size={14}
                  color={selectedIpFilter === null ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>All Addresses</span>
              </div>
            </div>
            <h3>Address Types</h3>
            <div className="flex flex-col gap-1">
              {ipAddressTypes.length > 0 ? (
                ipAddressTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedIpFilter === type.slug ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedIpFilter(
                        selectedIpFilter === type.slug ? null : type.slug,
                      )
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: type.color }}
                    />{" "}
                    <span>{type.name}</span>
                  </div>
                ))
              ) : (
                <>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedIpFilter === "gateway" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedIpFilter(
                        selectedIpFilter === "gateway" ? null : "gateway",
                      )
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: "#10b981" }}
                    />{" "}
                    <span>Gateway</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedIpFilter === "assigned" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedIpFilter(
                        selectedIpFilter === "assigned" ? null : "assigned",
                      )
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: "#3366ff" }}
                    />{" "}
                    <span>Assigned</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedIpFilter === "dhcp" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedIpFilter(
                        selectedIpFilter === "dhcp" ? null : "dhcp",
                      )
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: "#f59e0b" }}
                    />{" "}
                    <span>DHCP Pool</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedIpFilter === "reserved" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedIpFilter(
                        selectedIpFilter === "reserved" ? null : "reserved",
                      )
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: "#8b5cf6" }}
                    />{" "}
                    <span>Reserved</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedIpFilter === "infrastructure" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedIpFilter(
                        selectedIpFilter === "infrastructure"
                          ? null
                          : "infrastructure",
                      )
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: "#06b6d4" }}
                    />{" "}
                    <span>Infrastructure</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedIpFilter === "available" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedIpFilter(
                        selectedIpFilter === "available" ? null : "available",
                      )
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{
                        background: "#f1f3f5",
                        border: "1px solid #dee2e6",
                      }}
                    />{" "}
                    <span>Available</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {activeView === "topology" && (
          <>
            <h3>Filters</h3>
            <div className="flex flex-col gap-1 mb-6">
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedCategory === null ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSelectedCategory(null)}
              >
                <Share2
                  size={14}
                  color={selectedCategory === null ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>All Devices</span>
              </div>
            </div>
            <h3>Device Types</h3>
            <div className="flex flex-col gap-1 mb-6">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedCategory === cat.name ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === cat.name ? null : cat.name,
                      )
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: cat.color }}
                    />{" "}
                    <span>{cat.name}</span>
                  </div>
                ))
              ) : (
                <>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedCategory === "Server" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === "Server" ? null : "Server",
                      )
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: "#10b981" }}
                    />{" "}
                    <span>Server</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedCategory === "Networking" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === "Networking" ? null : "Networking",
                      )
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: "#3366ff" }}
                    />{" "}
                    <span>Networking</span>
                  </div>
                </>
              )}
            </div>
            <h3>Controls</h3>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] text-(--text-slate)">
                <code className="bg-(--muted-bg) px-1.5 py-px rounded text-[10px] mr-1.5">
                  Scroll
                </code>{" "}
                <span>Zoom in/out</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] text-(--text-slate)">
                <code className="bg-(--muted-bg) px-1.5 py-px rounded text-[10px] mr-1.5">
                  Drag
                </code>{" "}
                <span>Pan canvas</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] text-(--text-slate)">
                <code className="bg-(--muted-bg) px-1.5 py-px rounded text-[10px] mr-1.5">
                  Drag node
                </code>{" "}
                <span>Move device</span>
              </div>
            </div>
          </>
        )}

        {activeView === "wifi" && (
          <>
            <h3>Filters</h3>
            <div className="flex flex-col gap-1 mb-6">
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedServiceFilter === null ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSelectedServiceFilter(null)}
              >
                <Wifi
                  size={14}
                  color={selectedServiceFilter === null ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>All Networks</span>
              </div>
            </div>
            <h3>Security</h3>
            <div className="flex flex-col gap-1 mb-6">
              {wifiSecurities.length > 0 ? (
                wifiSecurities.map((security) => (
                  <div
                    key={security.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedServiceFilter === security.slug ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedServiceFilter(
                        selectedServiceFilter === security.slug
                          ? null
                          : security.slug,
                      )
                    }
                  >
                    <Lock
                      size={14}
                      color={
                        selectedServiceFilter === security.slug
                          ? "#3366ff"
                          : security.color
                      }
                    />{" "}
                    <span>{security.name}</span>
                  </div>
                ))
              ) : (
                <>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedServiceFilter === "wpa2" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedServiceFilter(
                        selectedServiceFilter === "wpa2" ? null : "wpa2",
                      )
                    }
                  >
                    <Lock
                      size={14}
                      color={
                        selectedServiceFilter === "wpa2" ? "#3366ff" : "#5e6670"
                      }
                    />{" "}
                    <span>WPA2</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedServiceFilter === "wpa3" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedServiceFilter(
                        selectedServiceFilter === "wpa3" ? null : "wpa3",
                      )
                    }
                  >
                    <Shield
                      size={14}
                      color={
                        selectedServiceFilter === "wpa3" ? "#3366ff" : "#5e6670"
                      }
                    />{" "}
                    <span>WPA3</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedServiceFilter === "open" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedServiceFilter(
                        selectedServiceFilter === "open" ? null : "open",
                      )
                    }
                  >
                    <Wifi
                      size={14}
                      color={
                        selectedServiceFilter === "open" ? "#3366ff" : "#5e6670"
                      }
                    />{" "}
                    <span>Open</span>
                  </div>
                </>
              )}
            </div>
            <h3>Band</h3>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] text-(--text-slate)">
                <code className="bg-(--muted-bg) px-1.5 py-px rounded text-[10px] mr-1.5">
                  2.4 GHz
                </code>{" "}
                <span>Legacy devices</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] text-(--text-slate)">
                <code className="bg-(--muted-bg) px-1.5 py-px rounded text-[10px] mr-1.5">
                  5 GHz
                </code>{" "}
                <span>High speed</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] text-(--text-slate)">
                <code className="bg-(--muted-bg) px-1.5 py-px rounded text-[10px] mr-1.5">
                  6 GHz
                </code>{" "}
                <span>WiFi 6E</span>
              </div>
            </div>
          </>
        )}

        {activeView === "services" && (
          <>
            <h3>Filters</h3>
            <div className="flex flex-col gap-1 mb-6">
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedServiceFilter === null ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSelectedServiceFilter(null)}
              >
                <Wifi
                  size={14}
                  color={selectedServiceFilter === null ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>All Services</span>
              </div>
            </div>
            <h3>Protocol</h3>
            <div className="flex flex-col gap-1 mb-6">
              {serviceProtocols.length > 0 ? (
                serviceProtocols.map((protocol) => (
                  <div
                    key={protocol.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedServiceFilter === protocol.slug ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedServiceFilter(
                        selectedServiceFilter === protocol.slug
                          ? null
                          : protocol.slug,
                      )
                    }
                  >
                    <Globe
                      size={14}
                      color={
                        selectedServiceFilter === protocol.slug
                          ? "#3366ff"
                          : protocol.color
                      }
                    />{" "}
                    <span>{protocol.name}</span>
                  </div>
                ))
              ) : (
                <>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedServiceFilter === "tcp" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedServiceFilter(
                        selectedServiceFilter === "tcp" ? null : "tcp",
                      )
                    }
                  >
                    <Globe
                      size={14}
                      color={
                        selectedServiceFilter === "tcp" ? "#3366ff" : "#5e6670"
                      }
                    />{" "}
                    <span>TCP</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedServiceFilter === "udp" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedServiceFilter(
                        selectedServiceFilter === "udp" ? null : "udp",
                      )
                    }
                  >
                    <Globe
                      size={14}
                      color={
                        selectedServiceFilter === "udp" ? "#3366ff" : "#5e6670"
                      }
                    />{" "}
                    <span>UDP</span>
                  </div>
                </>
              )}
            </div>
            <h3>Common Ports</h3>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] text-(--text-slate)">
                <code className="bg-(--muted-bg) px-1.5 py-px rounded text-[10px] mr-1.5">
                  80/443
                </code>{" "}
                <span>HTTP/HTTPS</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] text-(--text-slate)">
                <code className="bg-(--muted-bg) px-1.5 py-px rounded text-[10px] mr-1.5">
                  22
                </code>{" "}
                <span>SSH</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] text-(--text-slate)">
                <code className="bg-(--muted-bg) px-1.5 py-px rounded text-[10px] mr-1.5">
                  53
                </code>{" "}
                <span>DNS</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] text-(--text-slate)">
                <code className="bg-(--muted-bg) px-1.5 py-px rounded text-[10px] mr-1.5">
                  3306
                </code>{" "}
                <span>MySQL</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] text-(--text-slate)">
                <code className="bg-(--muted-bg) px-1.5 py-px rounded text-[10px] mr-1.5">
                  5432
                </code>{" "}
                <span>PostgreSQL</span>
              </div>
            </div>
          </>
        )}

        {activeView === "vlans" && (
          <>
            <h3>Filters</h3>
            <div className="flex flex-col gap-1 mb-6">
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedVlanRole === null ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSelectedVlanRole(null)}
              >
                <Network
                  size={14}
                  color={selectedVlanRole === null ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>All VLANs</span>
              </div>
            </div>
            <h3>VLAN Roles</h3>
            <div className="flex flex-col gap-1">
              {vlanRoles.length > 0 ? (
                vlanRoles.map((role) => (
                  <div
                    key={role.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedVlanRole === role.slug ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedVlanRole(
                        selectedVlanRole === role.slug ? null : role.slug,
                      )
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: role.color }}
                    />{" "}
                    <span>{role.name}</span>
                  </div>
                ))
              ) : (
                <>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedVlanRole === "management" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedVlanRole(
                        selectedVlanRole === "management" ? null : "management",
                      )
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: "#3366ff" }}
                    />{" "}
                    <span>Management</span>
                  </div>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedVlanRole === "production" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                    onClick={() =>
                      setSelectedVlanRole(
                        selectedVlanRole === "production" ? null : "production",
                      )
                    }
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: "#10b981" }}
                    />{" "}
                    <span>Production</span>
                  </div>
                </>
              )}
            </div>
            {vlanRoles.length > 0 && (
              <div className="mt-3">
                <div
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 text-[11px] text-(--text-light) hover:text-(--blue) hover:bg-(--hover)"
                  onClick={() => {
                    setSettingsTab?.("vlan-roles");
                    setActiveView("settings");
                  }}
                >
                  <Tag size={12} /> <span>Manage Roles</span>
                </div>
              </div>
            )}
          </>
        )}
        {activeView === "settings" && (
          <>
            <h3>Account</h3>
            <div className="flex flex-col gap-1 mb-6">
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${settingsTab === "profile" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSettingsTab?.("profile")}
              >
                <User
                  size={14}
                  color={settingsTab === "profile" ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>Profile</span>
              </div>
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${settingsTab === "security" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSettingsTab?.("security")}
              >
                <Lock
                  size={14}
                  color={settingsTab === "security" ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>Security</span>
              </div>
            </div>
            <h3>Preferences</h3>
            <div className="flex flex-col gap-1 mb-6">
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${settingsTab === "notifications" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSettingsTab?.("notifications")}
              >
                <Bell
                  size={14}
                  color={
                    settingsTab === "notifications" ? "#3366ff" : "#5e6670"
                  }
                />{" "}
                <span>Notifications</span>
              </div>
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${settingsTab === "application" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSettingsTab?.("application")}
              >
                <Globe
                  size={14}
                  color={settingsTab === "application" ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>Application</span>
              </div>
            </div>
            <h3>Customization</h3>
            <div className="flex flex-col gap-1 mb-6">
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${settingsTab === "categories" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSettingsTab?.("categories")}
              >
                <Tag
                  size={14}
                  color={settingsTab === "categories" ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>Categories</span>
              </div>
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${settingsTab === "sites" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSettingsTab?.("sites")}
              >
                <MapPin
                  size={14}
                  color={settingsTab === "sites" ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>Sites</span>
              </div>
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${settingsTab === "vlan-roles" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSettingsTab?.("vlan-roles")}
              >
                <Network
                  size={14}
                  color={settingsTab === "vlan-roles" ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>VLAN Roles</span>
              </div>
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${settingsTab === "platform-options" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSettingsTab?.("platform-options")}
              >
                <Tag
                  size={14}
                  color={
                    settingsTab === "platform-options" ? "#3366ff" : "#5e6670"
                  }
                />{" "}
                <span>Platform Options</span>
              </div>
            </div>
            <h3>System</h3>
            <div className="flex flex-col gap-1">
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${settingsTab === "data" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSettingsTab?.("data")}
              >
                <Database
                  size={14}
                  color={settingsTab === "data" ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>Data & Storage</span>
              </div>
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${settingsTab === "about" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSettingsTab?.("about")}
              >
                <Shield
                  size={14}
                  color={settingsTab === "about" ? "#3366ff" : "#5e6670"}
                />{" "}
                <span>About</span>
              </div>
            </div>
          </>
        )}
        {activeView === "changelog" && (
          <>
            <h3>Filters</h3>
            <div className="flex flex-col gap-1 mb-6">
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedChangelogFilter === null ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() => setSelectedChangelogFilter(null)}
              >
                <History
                  size={14}
                  color={
                    selectedChangelogFilter === null ? "#3366ff" : "#5e6670"
                  }
                />{" "}
                <span>All Changes</span>
              </div>
            </div>
            <h3>Action Type</h3>
            <div className="flex flex-col gap-1 mb-6">
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedChangelogFilter === "create" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() =>
                  setSelectedChangelogFilter(
                    selectedChangelogFilter === "create" ? null : "create",
                  )
                }
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: "#10b981" }}
                />{" "}
                <span>Created</span>
              </div>
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedChangelogFilter === "update" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() =>
                  setSelectedChangelogFilter(
                    selectedChangelogFilter === "update" ? null : "update",
                  )
                }
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: "#3366ff" }}
                />{" "}
                <span>Updated</span>
              </div>
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedChangelogFilter === "delete" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() =>
                  setSelectedChangelogFilter(
                    selectedChangelogFilter === "delete" ? null : "delete",
                  )
                }
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: "#ef4444" }}
                />{" "}
                <span>Deleted</span>
              </div>
            </div>
            <h3>Object Type</h3>
            <div className="flex flex-col gap-1">
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedChangelogFilter === "Device" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() =>
                  setSelectedChangelogFilter(
                    selectedChangelogFilter === "Device" ? null : "Device",
                  )
                }
              >
                <Server
                  size={12}
                  color={
                    selectedChangelogFilter === "Device" ? "#3366ff" : "#5e6670"
                  }
                />{" "}
                <span>Device</span>
              </div>
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedChangelogFilter === "Subnet" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() =>
                  setSelectedChangelogFilter(
                    selectedChangelogFilter === "Subnet" ? null : "Subnet",
                  )
                }
              >
                <Globe
                  size={12}
                  color={
                    selectedChangelogFilter === "Subnet" ? "#3366ff" : "#5e6670"
                  }
                />{" "}
                <span>Subnet</span>
              </div>
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedChangelogFilter === "IPAddress" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() =>
                  setSelectedChangelogFilter(
                    selectedChangelogFilter === "IPAddress"
                      ? null
                      : "IPAddress",
                  )
                }
              >
                <Globe
                  size={12}
                  color={
                    selectedChangelogFilter === "IPAddress"
                      ? "#3366ff"
                      : "#5e6670"
                  }
                />{" "}
                <span>IP Address</span>
              </div>
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedChangelogFilter === "VLAN" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() =>
                  setSelectedChangelogFilter(
                    selectedChangelogFilter === "VLAN" ? null : "VLAN",
                  )
                }
              >
                <Network
                  size={12}
                  color={
                    selectedChangelogFilter === "VLAN" ? "#3366ff" : "#5e6670"
                  }
                />{" "}
                <span>VLAN</span>
              </div>
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedChangelogFilter === "Service" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() =>
                  setSelectedChangelogFilter(
                    selectedChangelogFilter === "Service" ? null : "Service",
                  )
                }
              >
                <Box
                  size={12}
                  color={
                    selectedChangelogFilter === "Service"
                      ? "#3366ff"
                      : "#5e6670"
                  }
                />{" "}
                <span>Service</span>
              </div>
              <div
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-colors duration-150 ${selectedChangelogFilter === "IPRange" ? "text-(--blue) bg-(--blue-bg)" : "text-(--text) hover:text-(--blue) hover:bg-(--hover)"}`}
                onClick={() =>
                  setSelectedChangelogFilter(
                    selectedChangelogFilter === "IPRange" ? null : "IPRange",
                  )
                }
              >
                <Globe
                  size={12}
                  color={
                    selectedChangelogFilter === "IPRange"
                      ? "#3366ff"
                      : "#5e6670"
                  }
                />{" "}
                <span>IP Range</span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Sidebar;
