"use client";

import {
  Activity,
  AlertTriangle,
  Container,
  Edit2,
  ExternalLink,
  Globe,
  Plus,
  Radio,
  RefreshCw,
  Server,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomCategory, Device } from "@/types";

interface ServiceData {
  id: string;
  name: string;
  protocol: string;
  ports: string;
  description?: string | null;
  device: { id: string; name: string; ipAddress: string; category: string };
  url?: string | null;
  environment?: string | null;
  isDocker?: boolean;
  dockerImage?: string | null;
  dockerCompose?: boolean;
  stackName?: string | null;
  healthStatus?: string | null;
  version?: string | null;
  dependencies?: string | null;
  tags?: string | null;
  healthCheckEnabled?: boolean;
  lastCheckedAt?: string | null;
  lastResponseTime?: number | null;
  uptimePercent?: number | null;
  checkCount?: number;
  successCount?: number;
}

const protocolIcons: Record<string, React.ElementType> = {
  tcp: Globe,
  udp: Radio,
};

const envColors: Record<string, { bg: string; color: string }> = {
  production: { bg: "#dcfce7", color: "#166534" },
  staging: { bg: "#fef3c7", color: "#92400e" },
  development: { bg: "#dbeafe", color: "#1e40af" },
  testing: { bg: "#ede9fe", color: "#5b21b6" },
};

const healthColors: Record<string, { bg: string; color: string; dot: string }> =
  {
    healthy: { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
    degraded: { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
    down: { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
    unknown: { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
  };

const emptyForm = {
  name: "",
  protocol: "tcp",
  ports: "",
  description: "",
  deviceId: "",
  url: "",
  environment: "production",
  isDocker: false,
  dockerImage: "",
  dockerCompose: false,
  stackName: "",
  healthStatus: "unknown",
  version: "",
  dependencies: "",
  tags: "",
  healthCheckEnabled: false,
};

const ServicesView = ({
  searchTerm,
  selectedProtocol = null,
  protocolOptions = [],
  environmentOptions = [],
  healthStatusOptions = [],
  highlightId = null,
}: {
  searchTerm: string;
  selectedProtocol?: string | null;
  protocolOptions?: CustomCategory[];
  environmentOptions?: CustomCategory[];
  healthStatusOptions?: CustomCategory[];
  highlightId?: string | null;
}) => {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [healthChecking, setHealthChecking] = useState(false);

  const protocolMap = new Map(
    protocolOptions.map((option) => [option.slug, option]),
  );
  const environmentMap = new Map(
    environmentOptions.map((option) => [option.slug, option]),
  );

  const protocolSelectOptions =
    protocolOptions.length > 0
      ? protocolOptions.map((option) => ({
          value: option.slug,
          label: option.name,
        }))
      : [
          { value: "tcp", label: "TCP" },
          { value: "udp", label: "UDP" },
        ];

  const environmentSelectOptions =
    environmentOptions.length > 0
      ? environmentOptions.map((option) => ({
          value: option.slug,
          label: option.name,
        }))
      : [
          { value: "production", label: "Production" },
          { value: "staging", label: "Staging" },
          { value: "development", label: "Development" },
          { value: "testing", label: "Testing" },
        ];

  const healthSelectOptions =
    healthStatusOptions.length > 0
      ? healthStatusOptions.map((option) => ({
          value: option.slug,
          label: option.name,
        }))
      : [
          { value: "healthy", label: "Healthy" },
          { value: "degraded", label: "Degraded" },
          { value: "down", label: "Down" },
          { value: "unknown", label: "Unknown" },
        ];

  const getProtocolLabel = (slug: string) =>
    protocolMap.get(slug)?.name || slug.toUpperCase();
  const getEnvironmentLabel = (slug?: string | null) => {
    if (!slug) return "production";
    return environmentMap.get(slug)?.name || slug;
  };

  const fetchData = () => {
    Promise.all([
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/devices").then((r) => r.json()),
    ])
      .then(([svcData, devData]) => {
        setServices(Array.isArray(svcData) ? svcData : []);
        setDevices(Array.isArray(devData) ? devData : []);
      })
      .finally(() => setLoading(false));
  };

  const runHealthCheck = async () => {
    setHealthChecking(true);
    try {
      await fetch("/api/health-check", { method: "POST" });
      fetchData();
    } finally {
      setHealthChecking(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto health check timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const startAutoCheck = async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const settings = await res.json();
        if (settings.healthCheckEnabled && settings.healthCheckInterval > 0) {
          // Run immediately on mount
          fetch("/api/health-check", { method: "POST" }).then(() =>
            fetchData(),
          );
          // Then set interval
          timer = setInterval(async () => {
            await fetch("/api/health-check", { method: "POST" });
            fetchData();
          }, settings.healthCheckInterval * 1000);
        }
      } catch {
        /* settings not configured yet */
      }
    };
    startAutoCheck();
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modalOpen) {
          setModalOpen(false);
          setEditingId(null);
          return;
        }
        if (deleteModalOpen) {
          setDeleteModalOpen(false);
          return;
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [modalOpen, deleteModalOpen]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s: ServiceData) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      protocol: s.protocol,
      ports: s.ports,
      description: s.description || "",
      deviceId: s.device.id,
      url: s.url || "",
      environment: s.environment || "production",
      isDocker: s.isDocker || false,
      dockerImage: s.dockerImage || "",
      dockerCompose: s.dockerCompose || false,
      stackName: s.stackName || "",
      healthStatus: s.healthStatus || "unknown",
      version: s.version || "",
      dependencies: s.dependencies || "",
      tags: s.tags || "",
      healthCheckEnabled: s.healthCheckEnabled || false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      protocol: form.protocol,
      ports: form.ports,
      description: form.description || null,
      deviceId: form.deviceId,
      url: form.url || null,
      environment: form.environment,
      isDocker: form.isDocker,
      dockerImage: form.isDocker ? form.dockerImage || null : null,
      dockerCompose: form.isDocker ? form.dockerCompose : false,
      stackName:
        form.isDocker && form.dockerCompose ? form.stackName || null : null,
      healthStatus: form.healthStatus,
      version: form.version || null,
      dependencies: form.dependencies || null,
      tags: form.tags || null,
      healthCheckEnabled: form.healthCheckEnabled,
    };
    const method = editingId ? "PATCH" : "POST";
    const url = editingId ? `/api/services/${editingId}` : "/api/services";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setModalOpen(false);
      fetchData();
    } else {
      alert("Failed to save service");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/services/${deleteTarget}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchData();
    }
  };

  const handleHealthToggle = async (s: ServiceData, newStatus: string) => {
    await fetch(`/api/services/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ healthStatus: newStatus }),
    });
    fetchData();
  };

  const filtered = services.filter((s) => {
    const matchesSearch =
      !searchTerm ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.device?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.ports.includes(searchTerm) ||
      (s.dockerImage || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.tags || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.stackName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProtocol =
      !selectedProtocol || s.protocol === selectedProtocol;
    return matchesSearch && matchesProtocol;
  });

  const tcpCount = services.filter((s) => s.protocol === "tcp").length;
  const udpCount = services.filter((s) => s.protocol === "udp").length;
  const dockerCount = services.filter((s) => s.isDocker).length;
  const healthyCount = services.filter(
    (s) => s.healthStatus === "healthy",
  ).length;
  const uniqueDevices = new Set(services.map((s) => s.device?.id)).size;
  const uniquePorts = new Set(
    services.flatMap((s) => s.ports.split(",").map((p) => p.trim())),
  ).size;

  // Build dependency graph
  const dependencyEdges: {
    from: string;
    to: string;
    fromName: string;
    toName: string;
  }[] = [];
  services.forEach((s) => {
    if (s.dependencies) {
      s.dependencies
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean)
        .forEach((depName) => {
          const target = services.find(
            (t) => t.name.toLowerCase() === depName.toLowerCase(),
          );
          if (target) {
            dependencyEdges.push({
              from: s.id,
              to: target.id,
              fromName: s.name,
              toName: target.name,
            });
          }
        });
    }
  });

  const grouped = filtered.reduce(
    (
      acc: Record<
        string,
        { device: ServiceData["device"]; services: ServiceData[] }
      >,
      s,
    ) => {
      if (!s.device) return acc;
      if (!acc[s.device.id])
        acc[s.device.id] = { device: s.device, services: [] };
      acc[s.device.id].services.push(s);
      return acc;
    },
    {},
  );

  // Port conflict detection
  const portConflicts: {
    deviceName: string;
    port: string;
    protocol: string;
    services: string[];
  }[] = [];
  const byDevice: Record<string, ServiceData[]> = {};
  services.forEach((s) => {
    if (s.device) {
      if (!byDevice[s.device.id]) byDevice[s.device.id] = [];
      byDevice[s.device.id].push(s);
    }
  });
  Object.values(byDevice).forEach((svcList) => {
    const portMap: Record<string, string[]> = {};
    svcList.forEach((s) => {
      s.ports
        .split(",")
        .map((p) => p.trim())
        .forEach((port) => {
          const key = `${s.protocol}:${port}`;
          if (!portMap[key]) portMap[key] = [];
          portMap[key].push(s.name);
        });
    });
    Object.entries(portMap).forEach(([key, names]) => {
      if (names.length > 1) {
        const [protocol, port] = key.split(":");
        portConflicts.push({
          deviceName: svcList[0].device.name,
          port,
          protocol,
          services: names,
        });
      }
    });
  });

  // Docker stack grouping
  const stacks = services
    .filter((s) => s.isDocker && s.stackName)
    .reduce((acc: Record<string, ServiceData[]>, s) => {
      const key = s.stackName!;
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});

  if (loading)
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-[13px]">
        Loading services...
      </div>
    );

  return (
    <div className="animate-in fade-in duration-300">
      {/* Action buttons */}
      {services.length > 0 && devices.length > 0 && (
        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={runHealthCheck}
            disabled={healthChecking}
          >
            <RefreshCw
              size={14}
              className={healthChecking ? "animate-spin" : ""}
            />{" "}
            {healthChecking ? "Checking..." : "Run Health Check"}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} /> Add Service
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4 mb-6">
        {[
          { label: "Total Services", value: services.length, color: "#3366ff" },
          { label: "Healthy", value: healthyCount, color: "#10b981" },
          { label: "Docker", value: dockerCount, color: "#2563eb" },
          {
            label: "TCP / UDP",
            value: `${tcpCount} / ${udpCount}`,
            color: "#7c3aed",
          },
          { label: "Devices", value: uniqueDevices, color: "#f97316" },
          { label: "Unique Ports", value: uniquePorts, color: "#06b6d4" },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-5 text-center"
          >
            <div className="text-xs text-muted-foreground font-medium mb-1">
              {s.label}
            </div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Port Conflict Warnings */}
      {portConflicts.length > 0 && (
        <div className="mb-4 px-4 py-3 bg-(--red-bg) border border-(--red-border) rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-(--red)" />
            <span className="font-semibold text-[13px] text-(--red)">
              Port Conflicts Detected ({portConflicts.length})
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {portConflicts.map((c, i) => (
              <div
                key={i}
                className="text-xs text-(--red) flex gap-1.5 items-center"
              >
                <code className="bg-(--red-bg-subtle) px-1.5 py-px rounded text-[11px]">
                  {c.protocol.toUpperCase()}:{c.port}
                </code>
                <span>
                  on <strong>{c.deviceName}</strong> — used by:{" "}
                  {c.services.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependency Map */}
      {dependencyEdges.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold flex items-center gap-2">
              <Zap size={16} /> Service Dependencies
            </h2>
            <span className="text-[11px] text-muted-foreground bg-(--muted-bg) px-2 py-0.5 rounded">
              {dependencyEdges.length} connections
            </span>
          </div>
          <div className="flex flex-wrap gap-2 p-3">
            {dependencyEdges.map((edge, i) => {
              const fromSvc = services.find((s) => s.id === edge.from);
              const toSvc = services.find((s) => s.id === edge.to);
              const fromHealth =
                healthColors[fromSvc?.healthStatus || "unknown"];
              const toHealth = healthColors[toSvc?.healthStatus || "unknown"];
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs"
                >
                  <div className="flex items-center gap-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: fromHealth.dot }}
                    />
                    <span className="font-semibold">{edge.fromName}</span>
                  </div>
                  <span className="text-[10px] text-(--text-light)">
                    depends on
                  </span>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: toHealth.dot }}
                    />
                    <span className="font-semibold">{edge.toName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-lg">
          <Zap size={40} className="text-[#cbd5e1]" />
          <h3 className="text-base font-semibold mt-4 mb-2">
            No services registered
          </h3>
          <p className="text-[13px] text-muted-foreground mb-6 max-w-[360px]">
            {devices.length === 0
              ? "Add devices first, then register services running on them."
              : "Register services running on your devices to track ports and protocols."}
          </p>
          {devices.length > 0 && (
            <Button onClick={openCreate}>
              <Plus size={14} /> Add Service
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Docker Stacks */}
          {Object.keys(stacks).length > 0 && (
            <div className="bg-card border border-border rounded-lg p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-semibold flex items-center gap-2">
                  <Container size={16} /> Docker Stacks
                </h2>
                <span className="text-[11px] text-muted-foreground bg-(--muted-bg) px-2 py-0.5 rounded">
                  {Object.keys(stacks).length} stacks
                </span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
                {Object.entries(stacks).map(([stackName, stackServices]) => (
                  <div
                    key={stackName}
                    className="bg-card border border-border rounded-[10px] p-4"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <Container size={16} className="text-[#2563eb]" />
                        <span className="font-semibold text-[13px]">
                          {stackName}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-(--blue-bg) text-(--blue)">
                        {stackServices.length} containers
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {stackServices.map((s) => {
                        const hc = healthColors[s.healthStatus || "unknown"];
                        return (
                          <div
                            key={s.id}
                            className="flex items-center gap-2 px-1.5 py-1 rounded-md bg-(--surface-alt) text-xs"
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: hc.dot }}
                            />
                            <span className="font-medium flex-1 min-w-0 truncate">
                              {s.name}
                            </span>
                            {s.dockerImage && (
                              <code className="text-[9px] text-(--text-slate) bg-(--muted-bg) px-1 py-px rounded">
                                {s.dockerImage.split("/").pop()}
                              </code>
                            )}
                            <code className="text-[10px] text-(--text-light)">
                              :{s.ports}
                            </code>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service Cards by Device */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-4 mb-6">
            {Object.values(grouped).map(({ device, services: svcList }) => (
              <div
                key={device.id}
                className="bg-(--surface) border border-border rounded-lg overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 px-5 bg-(--surface-alt) border-b border-border">
                  <div>
                    <div className="text-[13px] font-semibold">
                      {device.name}
                    </div>
                    <code className="text-[11px] text-(--text-muted)">
                      {device.ipAddress}
                    </code>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-(--blue-bg) text-(--blue)">
                    {svcList.length} service{svcList.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {svcList.map((s) => {
                    const Icon = protocolIcons[s.protocol] || Globe;
                    const hc = healthColors[s.healthStatus || "unknown"];
                    const ec =
                      envColors[s.environment || "production"] ||
                      envColors.production;
                    return (
                      <div
                        key={s.id}
                        className="px-5 py-3.5 transition-colors hover:bg-(--hover)"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: hc.dot }}
                            title={s.healthStatus || "unknown"}
                          />
                          <div className="w-8 h-8 rounded-lg bg-(--blue-bg) text-(--blue) flex items-center justify-center shrink-0">
                            <Icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-medium truncate">
                                {s.name}
                              </span>
                              {s.version && (
                                <span className="text-[9px] text-(--text-light) font-normal">
                                  v{s.version}
                                </span>
                              )}
                            </div>
                            {s.description && (
                              <div className="text-[11px] text-(--text-muted) mt-0.5 truncate">
                                {s.description}
                              </div>
                            )}
                          </div>
                          <code className="text-[10px] bg-(--muted-bg) px-2 py-1 rounded shrink-0 font-mono">
                            {s.protocol.toUpperCase()}:{s.ports}
                          </code>
                          <div className="flex gap-0.5 shrink-0">
                            {s.url && (
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[#3366ff] hover:bg-accent"
                                title="Open URL"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(s)}
                            >
                              <Edit2 size={12} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#ef4444] hover:text-[#ef4444]"
                              onClick={() => {
                                setDeleteTarget(s.id);
                                setDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-wrap mt-2 pl-13">
                          {s.isDocker && (
                            <span className="rounded px-1.5 py-px text-[9px] font-medium bg-[#dbeafe] text-[#1e40af]">
                              Docker
                            </span>
                          )}
                          {s.dockerImage && (
                            <span className="rounded px-1.5 py-px text-[9px] font-medium bg-(--muted-bg) text-(--text-slate)">
                              {s.dockerImage.length > 25
                                ? s.dockerImage.slice(0, 25) + "…"
                                : s.dockerImage}
                            </span>
                          )}
                          <span
                            className="rounded px-1.5 py-px text-[9px] font-medium"
                            style={{ background: ec.bg, color: ec.color }}
                          >
                            {getEnvironmentLabel(s.environment)}
                          </span>
                          {s.tags
                            ?.split(",")
                            .map((t) => t.trim())
                            .filter(Boolean)
                            .map((t) => (
                              <span
                                key={t}
                                className="rounded px-1.5 py-px text-[9px] font-medium bg-(--muted-bg) text-(--text-slate)"
                              >
                                {t}
                              </span>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Full Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden mt-6">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-sm font-semibold">All Services</h2>
              <span className="text-[11px] text-muted-foreground bg-(--muted-bg) px-2 py-0.5 rounded">
                {filtered.length} services
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr>
                    <th className="w-[30px]"></th>
                    <th>Service</th>
                    <th className="w-20">Protocol</th>
                    <th className="w-20">Port(s)</th>
                    <th>Device</th>
                    <th className="w-[110px]">Env</th>
                    <th className="w-[130px]">Health</th>
                    <th className="w-[90px]">Uptime</th>
                    <th className="w-[100px]">Type</th>
                    <th>Description</th>
                    <th className="w-[70px] text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const hc = healthColors[s.healthStatus || "unknown"];
                    const ec =
                      envColors[s.environment || "production"] ||
                      envColors.production;
                    return (
                      <tr
                        key={s.id}
                        data-highlight-id={s.id}
                        className={
                          highlightId === s.id ? "highlight-flash" : ""
                        }
                      >
                        <td>
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: hc.dot }}
                            title={s.healthStatus || "unknown"}
                          />
                        </td>
                        <td className="font-medium">
                          <div className="flex items-center gap-1">
                            {s.name}
                            {s.version && (
                              <span className="text-[9px] text-(--text-light)">
                                v{s.version}
                              </span>
                            )}
                            {s.url && (
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#3366ff] inline-flex"
                              >
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-(--blue-bg) text-(--blue)">
                            {getProtocolLabel(s.protocol)}
                          </span>
                        </td>
                        <td>
                          <code className="text-[11px] bg-(--muted-bg) px-1.5 py-0.5 rounded">
                            {s.ports}
                          </code>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Server size={11} className="text-[#3366ff]" />
                            <span className="text-xs">{s.device?.name}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap"
                            style={{ background: ec.bg, color: ec.color }}
                          >
                            {getEnvironmentLabel(s.environment)}
                          </span>
                        </td>
                        <td className="overflow-visible!">
                          <select
                            value={s.healthStatus || "unknown"}
                            onChange={(e) =>
                              handleHealthToggle(s, e.target.value)
                            }
                            className="text-[11px] px-2 py-1 rounded cursor-pointer outline-none whitespace-nowrap"
                            style={{
                              border: `1px solid ${hc.dot}`,
                              background: hc.bg,
                              color: hc.color,
                            }}
                          >
                            {healthSelectOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {s.healthCheckEnabled ? (
                            <div className="flex flex-col gap-px">
                              <div className="flex items-center gap-1">
                                <Activity
                                  size={10}
                                  style={{
                                    color:
                                      s.uptimePercent != null &&
                                      s.uptimePercent >= 99
                                        ? "#22c55e"
                                        : s.uptimePercent != null &&
                                            s.uptimePercent >= 90
                                          ? "#f59e0b"
                                          : "#ef4444",
                                  }}
                                />
                                <span className="text-[11px] font-semibold">
                                  {s.uptimePercent != null
                                    ? `${s.uptimePercent}%`
                                    : "—"}
                                </span>
                              </div>
                              {s.lastResponseTime != null && (
                                <span className="text-[9px] text-(--text-light)">
                                  {s.lastResponseTime}ms
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#cbd5e1]">
                              —
                            </span>
                          )}
                        </td>
                        <td>
                          {s.isDocker ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#dbeafe] text-[#1e40af]">
                              Docker{s.stackName ? ` · ${s.stackName}` : ""}
                            </span>
                          ) : (
                            <span className="text-[11px] text-(--text-light)">
                              Native
                            </span>
                          )}
                        </td>
                        <td className="text-muted-foreground text-xs">
                          {s.description || "—"}
                        </td>
                        <td className="text-right pr-2">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(s)}
                            >
                              <Edit2 size={12} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#ef4444] hover:text-[#ef4444]"
                              onClick={() => {
                                setDeleteTarget(s.id);
                                setDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Service" : "Add Service"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Service Name
                </Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Nginx Proxy"
                  className="h-9 text-[13px]"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Device
                </Label>
                <select
                  required
                  className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)"
                  value={form.deviceId}
                  onChange={(e) =>
                    setForm({ ...form, deviceId: e.target.value })
                  }
                >
                  <option value="">Select device...</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.ipAddress})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Protocol
                </Label>
                <select
                  className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)"
                  value={form.protocol}
                  onChange={(e) =>
                    setForm({ ...form, protocol: e.target.value })
                  }
                >
                  {protocolSelectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Port(s)
                </Label>
                <Input
                  required
                  value={form.ports}
                  onChange={(e) => setForm({ ...form, ports: e.target.value })}
                  placeholder="80,443"
                  className="h-9 text-[13px]"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Version
                </Label>
                <Input
                  value={form.version}
                  onChange={(e) =>
                    setForm({ ...form, version: e.target.value })
                  }
                  placeholder="e.g. 2.19.0"
                  className="h-9 text-[13px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Access URL
                </Label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://service.local:8080"
                  className="h-9 text-[13px]"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Environment
                </Label>
                <select
                  className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)"
                  value={form.environment}
                  onChange={(e) =>
                    setForm({ ...form, environment: e.target.value })
                  }
                >
                  {environmentSelectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Health Status
                </Label>
                <select
                  className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)"
                  value={form.healthStatus}
                  onChange={(e) =>
                    setForm({ ...form, healthStatus: e.target.value })
                  }
                >
                  {healthSelectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Tags (comma-separated)
                </Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="web, proxy, critical"
                  className="h-9 text-[13px]"
                />
              </div>
            </div>

            {/* Docker Section */}
            <div className="p-4 bg-(--surface-alt) rounded-lg border border-border">
              <label
                className="flex items-center gap-2 cursor-pointer text-[13px] font-semibold"
                style={{ marginBottom: form.isDocker ? "1rem" : 0 }}
              >
                <input
                  type="checkbox"
                  checked={form.isDocker}
                  onChange={(e) =>
                    setForm({ ...form, isDocker: e.target.checked })
                  }
                  className="accent-[#2563eb]"
                />
                <Container size={14} className="text-[#2563eb]" /> Running in
                Docker
              </label>
              {form.isDocker && (
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Docker Image
                    </Label>
                    <Input
                      value={form.dockerImage}
                      onChange={(e) =>
                        setForm({ ...form, dockerImage: e.target.value })
                      }
                      placeholder="nginx:latest"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Stack Name
                    </Label>
                    <Input
                      value={form.stackName}
                      onChange={(e) =>
                        setForm({ ...form, stackName: e.target.value })
                      }
                      placeholder="e.g. media-stack"
                      className="h-9 text-[13px]"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs col-span-2">
                    <input
                      type="checkbox"
                      checked={form.dockerCompose}
                      onChange={(e) =>
                        setForm({ ...form, dockerCompose: e.target.checked })
                      }
                      className="accent-[#2563eb]"
                    />
                    Part of Docker Compose stack
                  </label>
                </div>
              )}
            </div>

            {/* Health Check Section */}
            {form.url && (
              <div className="p-4 bg-(--green-bg) rounded-lg border border-(--green) border-opacity-20">
                <label className="flex items-center gap-2 cursor-pointer text-[13px] font-semibold">
                  <input
                    type="checkbox"
                    checked={form.healthCheckEnabled}
                    onChange={(e) =>
                      setForm({ ...form, healthCheckEnabled: e.target.checked })
                    }
                    className="accent-[#22c55e]"
                  />
                  <Activity size={14} className="text-[#22c55e]" /> Enable Auto
                  Health Check
                </label>
                {form.healthCheckEnabled && (
                  <p className="text-[11px] text-(--text-slate) mt-2 mb-0">
                    This service&apos;s URL will be automatically pinged at the
                    interval configured in Settings. Health status will update
                    to healthy, degraded, or down based on response.
                  </p>
                )}
              </div>
            )}

            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Dependencies (comma-separated service names)
              </Label>
              <Input
                value={form.dependencies}
                onChange={(e) =>
                  setForm({ ...form, dependencies: e.target.value })
                }
                placeholder="e.g. PostgreSQL, Redis"
                className="h-9 text-[13px]"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Description
              </Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Optional"
                className="h-9 text-[13px]"
              />
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? "Save Changes" : "Add Service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-[400px] text-center">
          <DialogHeader className="flex flex-col items-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-(--red-bg-subtle) text-(--red)">
              <Trash2 size={24} />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Delete Service?
            </DialogTitle>
            <DialogDescription className="mt-2">
              This will permanently remove this service.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-4 sm:justify-center">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesView;
