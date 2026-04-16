import React, { useMemo, useCallback, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import ZoomPan from "@/components/common/ZoomPan";
import PlotGrid from "@/components/plots/map/PlotGrid";
import PlotTooltip from "@/components/plots/map/PlotTooltip";
import PlotLegend from "@/components/plots/map/PlotLegend";

export default function NewPlotReservation1Map({ filters = {}, onPlotClick }) {
  const [hoverData, setHoverData] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const { data: plots = [], isLoading, isError } = useQuery({
    queryKey: ["newPlotReservation1-map"],
    queryFn: () => base44.entities.NewPlotReservation1.list("Grave", 2000),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Single-pass filter using parent filters directly — no local duplication
  const filteredPlots = useMemo(() => {
    const statusFilter = filters.status;
    const searchQuery = (filters.search || "").toLowerCase();
    const ownerQuery = (filters.owner || "").toLowerCase();
    const plotQuery = (filters.plot || "").toLowerCase();

    return plots.filter((plot) => {
      // Status filter
      if (statusFilter && statusFilter !== "All" && plot.Status !== statusFilter) return false;

      // Text search
      if (searchQuery) {
        const searchable = [plot.Grave, plot.Row, plot.FirstName, plot.lastname, plot.FamilyName, plot.Notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(searchQuery)) return false;
      }

      // Owner filter
      if (ownerQuery) {
        if (!String(plot.FamilyName || "").toLowerCase().includes(ownerQuery)) return false;
      }

      // Plot number filter
      if (plotQuery) {
        const plotStr = String(plot.Grave || "").toLowerCase();
        const numItem = parseInt(plotStr.replace(/\D/g, "")) || 0;
        const numWanted = /^[0-9]+$/.test(plotQuery) ? parseInt(plotQuery, 10) : null;
        if (numWanted != null) {
          if (numItem !== numWanted) return false;
        } else if (!plotStr.includes(plotQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [plots, filters.status, filters.search, filters.owner, filters.plot]);

  const handleHover = useCallback((e, data) => {
    if (!data || !e) {
      setIsTooltipVisible(false);
      return;
    }
    const rect = e.target.getBoundingClientRect();
    setMousePos({ x: rect.right, y: rect.top + rect.height / 2 });
    setHoverData(data);
    setIsTooltipVisible(true);
  }, []);

  const handlePlotClick = useCallback(
    (plot) => {
      // Dismiss tooltip on click for mobile
      setIsTooltipVisible(false);
      if (onPlotClick) {
        onPlotClick({
          id: plot.id,
          plot_number: plot.Grave,
          row_number: plot.Row,
          status: plot.Status,
          first_name: plot.FirstName,
          last_name: plot.lastname,
          family_name: plot.FamilyName,
        });
      }
    },
    [onPlotClick]
  );

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 flex items-center justify-center gap-2 text-gray-500" role="status">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        <span className="text-sm font-medium">Loading cemetery map…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white border border-red-200 rounded-lg shadow-sm p-8 text-center text-red-600" role="alert">
        <p className="text-sm font-medium">Failed to load plot data. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="select-none">
      {/* Plot count */}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-xs text-gray-400">
          Showing <span className="font-semibold text-gray-600">{filteredPlots.length}</span> of{" "}
          <span className="font-semibold text-gray-600">{plots.length}</span> plots
        </p>
      </div>

      <ZoomPan
        className="w-full min-h-[60vh] sm:min-h-[70vh] md:min-h-[78vh] rounded-lg border border-gray-200 overflow-auto bg-white/50"
        minScale={0.35}
        maxScale={2.5}
        initialScale={0.9}
      >
        <div className="p-4 inline-block min-w-max">
          <PlotGrid plots={filteredPlots} onHover={handleHover} onPlotClick={handlePlotClick} />
        </div>
      </ZoomPan>

      <PlotLegend />
      <PlotTooltip data={hoverData} visible={isTooltipVisible} position={mousePos} />
    </div>
  );
}