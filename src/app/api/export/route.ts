import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getActiveSite } from "@/lib/site-context";

export async function GET() {
  try {
    const { siteId } = await getActiveSite();
    if (!siteId)
      return NextResponse.json({ error: "No active site" }, { status: 401 });

    const [site, devices, subnets, vlans, services, wifi] = await Promise.all([
      prisma.site.findUnique({ where: { id: siteId } }),
      prisma.device.findMany({ where: { siteId }, orderBy: { name: "asc" } }),
      prisma.subnet.findMany({
        where: { siteId },
        include: { vlan: true, ipAddresses: true, ipRanges: true },
        orderBy: { prefix: "asc" },
      }),
      prisma.vLAN.findMany({
        where: { siteId },
        include: { subnets: true },
        orderBy: { vid: "asc" },
      }),
      prisma.service.findMany({
        where: { siteId },
        include: { device: true },
        orderBy: { name: "asc" },
      }),
      prisma.wifiNetwork.findMany({
        where: { siteId },
        include: { vlan: true, subnet: true },
        orderBy: { ssid: "asc" },
      }),
    ]);

    const now = new Date().toLocaleString();
    let md = `# Network Documentation — ${site?.name || "Unknown Site"}\n\n`;
    md += `> Generated on ${now}\n\n`;
    md += `---\n\n`;

    // Summary
    md += `## Summary\n\n`;
    md += `| Metric | Count |\n|--------|-------|\n`;
    md += `| Devices | ${devices.length} |\n`;
    md += `| Subnets | ${subnets.length} |\n`;
    md += `| VLANs | ${vlans.length} |\n`;
    md += `| Services | ${services.length} |\n`;
    md += `| WiFi Networks | ${wifi.length} |\n\n`;

    // Devices
    md += `## Devices\n\n`;
    md += `| Name | IP Address | MAC Address | Category | Status | Platform |\n`;
    md += `|------|-----------|-------------|----------|--------|----------|\n`;
    devices.forEach((d) => {
      md += `| ${d.name} | ${d.ipAddress || "—"} | ${d.macAddress || "—"} | ${d.category} | ${d.status} | ${d.platform || "—"} |\n`;
    });
    md += `\n`;

    // VLANs
    md += `## VLANs\n\n`;
    md += `| VID | Name | Role | Status | Subnets |\n`;
    md += `|-----|------|------|--------|---------|\n`;
    vlans.forEach((v) => {
      const subnetList =
        v.subnets
          .map((s: { prefix: string; mask: number }) => `${s.prefix}/${s.mask}`)
          .join(", ") || "—";
      md += `| ${v.vid} | ${v.name} | ${v.role || "—"} | ${v.status} | ${subnetList} |\n`;
    });
    md += `\n`;

    // Subnets
    md += `## Subnets & IP Allocation\n\n`;
    subnets.forEach((s) => {
      const totalIps = 2 ** (32 - s.mask) - 2;
      const usedIps = s.ipAddresses.length;
      const pct = totalIps > 0 ? Math.round((usedIps / totalIps) * 100) : 0;
      md += `### ${s.prefix}/${s.mask} — ${s.description || "Unnamed"}\n\n`;
      md += `- **Gateway:** ${s.gateway || "Not set"}\n`;
      md += `- **VLAN:** ${s.vlan ? `${s.vlan.vid} (${s.vlan.name})` : "None"}\n`;
      md += `- **Utilization:** ${usedIps} / ${totalIps} (${pct}%)\n`;
      md += `- **Role:** ${s.role || "General"}\n\n`;
      if (s.ipRanges.length > 0) {
        md += `**Ranges:**\n\n`;
        md += `| Range | Role | Description |\n|-------|------|-------------|\n`;
        s.ipRanges.forEach((r) => {
          md += `| ${r.startAddr} — ${r.endAddr} | ${r.role} | ${r.description || "—"} |\n`;
        });
        md += `\n`;
      }
      if (s.ipAddresses.length > 0) {
        md += `**Assigned IPs:**\n\n`;
        md += `| Address | DNS Name | Status | Description |\n|---------|----------|--------|-------------|\n`;
        s.ipAddresses.forEach((ip) => {
          md += `| ${ip.address} | ${ip.dnsName || "—"} | ${ip.status} | ${ip.description || "—"} |\n`;
        });
        md += `\n`;
      }
    });

    // Services
    md += `## Services\n\n`;
    md += `| Service | Protocol | Port(s) | Device | Environment | Health | Docker | Version |\n`;
    md += `|---------|----------|---------|--------|-------------|--------|--------|--------|\n`;
    services.forEach((s) => {
      md += `| ${s.name} | ${s.protocol.toUpperCase()} | ${s.ports} | ${s.device?.name || "—"} | ${s.environment || "production"} | ${s.healthStatus || "unknown"} | ${s.isDocker ? `Yes (${s.dockerImage || "—"})` : "No"} | ${s.version || "—"} |\n`;
    });
    md += `\n`;

    // WiFi
    md += `## WiFi Networks\n\n`;
    md += `| SSID | Security | Band | VLAN | Subnet | Status | Guest | Features |\n`;
    md += `|------|----------|------|------|--------|--------|-------|----------|\n`;
    wifi.forEach((w) => {
      const features =
        [
          w.bandSteering && "Band Steering",
          w.clientIsolation && "Client Isolation",
          w.pmf !== "disabled" && `PMF: ${w.pmf}`,
        ]
          .filter(Boolean)
          .join(", ") || "—";
      md += `| ${w.ssid} | ${w.security} | ${w.band} | ${w.vlan ? `VLAN ${w.vlan.vid}` : "—"} | ${w.subnet ? `${w.subnet.prefix}/${w.subnet.mask}` : "—"} | ${w.enabled ? "Enabled" : "Disabled"} | ${w.guestNetwork ? "Yes" : "No"} | ${features} |\n`;
    });
    md += `\n`;

    md += `---\n\n*This document was auto-generated by Subnetly.*\n`;

    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="network-documentation-${site?.slug || "export"}-${new Date().toISOString().split("T")[0]}.md"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 },
    );
  }
}
