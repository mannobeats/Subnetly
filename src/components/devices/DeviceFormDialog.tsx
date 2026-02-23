"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomCategory, Device } from "@/types";

export interface SubnetOption {
  id: string;
  prefix: string;
  mask: number;
  role?: string | null;
  description?: string | null;
  gateway?: string | null;
  vlan?: { vid: number; name: string } | null;
  ipAddresses: { address: string }[];
}

export interface DeviceFormData {
  name: string;
  macAddress: string;
  ipAddress: string;
  category: string;
  notes: string;
  platform: string;
  status: string;
}

interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDevice: Device | null;
  formData: DeviceFormData;
  setFormData: (updater: (prev: DeviceFormData) => DeviceFormData) => void;
  categories: CustomCategory[];
  deviceStatuses: CustomCategory[];
  subnets: SubnetOption[];
  selectedSubnetId: string;
  availableIps: string[];
  onSubnetChange: (subnetId: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export default function DeviceFormDialog({
  open,
  onOpenChange,
  editingDevice,
  formData,
  setFormData,
  categories,
  deviceStatuses,
  subnets,
  selectedSubnetId,
  availableIps,
  onSubnetChange,
  onSubmit,
}: DeviceFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {editingDevice ? "Edit Device" : "Add New Device"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Device Name
            </Label>
            <Input
              required
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Proxmox-Node-01"
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Category
            </Label>
            <select
              className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)"
              value={formData.category}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
            >
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="Networking">Networking</option>
                  <option value="Server">Server</option>
                  <option value="VM">VM</option>
                  <option value="LXC">LXC</option>
                  <option value="Client">Client</option>
                  <option value="IoT">IoT</option>
                </>
              )}
            </select>
          </div>
          {subnets.length > 0 && (
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                {editingDevice ? "Subnet" : "Assign from Subnet (Optional)"}
              </Label>
              <select
                className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)"
                value={selectedSubnetId}
                onChange={(e) => onSubnetChange(e.target.value)}
              >
                <option value="">Manual IP entry</option>
                {subnets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.prefix}/{s.mask}
                    {s.role ? ` • ${s.role}` : ""}
                    {s.vlan ? ` • VLAN ${s.vlan.vid}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                IP Address
              </Label>
              {selectedSubnetId && availableIps.length > 0 ? (
                <select
                  required
                  className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)"
                  value={formData.ipAddress}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ipAddress: e.target.value,
                    }))
                  }
                >
                  <option value="">Select available IP...</option>
                  {editingDevice && formData.ipAddress && (
                    <option value={formData.ipAddress}>
                      {formData.ipAddress} (current)
                    </option>
                  )}
                  {availableIps.slice(0, 50).map((ip) => (
                    <option key={ip} value={ip}>
                      {ip}
                    </option>
                  ))}
                  {availableIps.length > 50 && (
                    <option disabled>
                      ...and {availableIps.length - 50} more
                    </option>
                  )}
                </select>
              ) : (
                <Input
                  required
                  value={formData.ipAddress}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ipAddress: e.target.value,
                    }))
                  }
                  placeholder="10.0.10.x"
                  className="h-9 text-[13px]"
                />
              )}
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Platform
              </Label>
              <Input
                value={formData.platform}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, platform: e.target.value }))
                }
                placeholder="e.g. Ubuntu 22.04"
                className="h-9 text-[13px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                MAC Address
              </Label>
              <Input
                required
                value={formData.macAddress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    macAddress: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="XX:XX:XX:XX:XX:XX"
                className="h-9 text-[13px]"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Status
              </Label>
              <select
                className="w-full h-9 border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 focus:outline-none focus:border-(--blue) focus:bg-(--surface)"
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                {deviceStatuses.length > 0 ? (
                  deviceStatuses.map((status) => (
                    <option key={status.id} value={status.slug}>
                      {status.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="active">Active</option>
                    <option value="planned">Planned</option>
                    <option value="staged">Staged</option>
                    <option value="offline">Offline</option>
                    <option value="decommissioned">Decommissioned</option>
                  </>
                )}
              </select>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Notes (Optional)
            </Label>
            <textarea
              className="w-full border border-border rounded bg-(--surface-alt) text-(--text) text-[13px] px-3 pt-2 focus:outline-none focus:border-(--blue) focus:bg-(--surface)"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Purpose or description"
              rows={3}
            />
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingDevice ? "Apply Changes" : "Save Device"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
