"use client";

interface TopologyLegendCloud {
  id: string;
  subnet: {
    prefix: string;
    mask: number;
    vlan?: { vid: number; name: string } | null;
  };
  color: string;
}

interface TopologyLegendProps {
  clouds: TopologyLegendCloud[];
}

export default function TopologyLegend({ clouds }: TopologyLegendProps) {
  if (clouds.length === 0) return null;

  return (
    <div className="absolute top-3 left-3 flex flex-col gap-1 bg-(--surface) border border-border rounded-lg px-3 py-2 z-10 shadow-sm">
      {clouds.map((cloud) => (
        <div key={cloud.id} className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-sm shrink-0"
            style={{ background: cloud.color }}
          />
          <span className="text-[10px] font-medium text-(--text-slate) whitespace-nowrap">
            {cloud.subnet.prefix}/{cloud.subnet.mask}
            {cloud.subnet.vlan && (
              <span className="opacity-60">
                {" "}
                (VLAN {cloud.subnet.vlan.vid})
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
