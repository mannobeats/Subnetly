'use client'

import { Layers, Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'

interface TopologyControlsProps {
  showSubnetClouds: boolean
  zoom: number
  onToggleSubnetClouds: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onCenterView: () => void
  onResetLayout: () => void
}

export default function TopologyControls({
  showSubnetClouds,
  zoom,
  onToggleSubnetClouds,
  onZoomIn,
  onZoomOut,
  onCenterView,
  onResetLayout,
}: TopologyControlsProps) {
  return (
    <div className="absolute top-3 right-3 flex items-center gap-1 bg-(--surface) border border-border rounded-lg px-2 py-1 z-10 shadow-sm">
      <button
        className={`flex items-center justify-center w-7 h-7 border-none bg-transparent rounded-md cursor-pointer text-(--text-slate) transition-all hover:bg-(--muted-bg-alt) hover:text-(--text) ${showSubnetClouds ? 'bg-(--blue-bg)! text-(--blue-light)!' : ''}`}
        onClick={onToggleSubnetClouds}
        title="Toggle Subnet Groups"
      >
        <Layers size={14} />
      </button>
      <div className="w-px h-4 bg-border" />
      <button className="flex items-center justify-center w-7 h-7 border-none bg-transparent rounded-md cursor-pointer text-(--text-slate) transition-all hover:bg-(--muted-bg-alt) hover:text-(--text)" onClick={onZoomIn} title="Zoom In"><ZoomIn size={14} /></button>
      <button className="flex items-center justify-center w-7 h-7 border-none bg-transparent rounded-md cursor-pointer text-(--text-slate) transition-all hover:bg-(--muted-bg-alt) hover:text-(--text)" onClick={onZoomOut} title="Zoom Out"><ZoomOut size={14} /></button>
      <button className="flex items-center justify-center w-7 h-7 border-none bg-transparent rounded-md cursor-pointer text-(--text-slate) transition-all hover:bg-(--muted-bg-alt) hover:text-(--text)" onClick={onCenterView} title="Center View"><Maximize2 size={14} /></button>
      <button className="flex items-center justify-center w-7 h-7 border-none bg-transparent rounded-md cursor-pointer text-(--text-slate) transition-all hover:bg-(--muted-bg-alt) hover:text-(--text)" onClick={onResetLayout} title="Reset Layout"><RotateCcw size={14} /></button>
      <span className="text-[10px] text-(--text-light) font-medium min-w-8 text-center">{Math.round(zoom * 100)}%</span>
    </div>
  )
}

