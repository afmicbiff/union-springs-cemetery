import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ZoomPan from "@/components/common/ZoomPan";
import OldPlotGrid from "@/components/plots/OldPlotGrid";

const IMAGE_URL = "https://media.base44.com/images/public/693cd1f0c20a0662b5f281d5/a21339067_GraveyardPICadobe2.jpg";

export default function OldCombinedMap({ plots, isAdmin, onHover, onEdit, zoomPanRef }) {
  return (
    <div className="relative w-full border border-gray-200 rounded-lg bg-stone-50 overflow-hidden" style={{ height: "80vh", minHeight: "600px" }}>
      <ZoomPan ref={zoomPanRef} minScale={0.2} maxScale={5} initialScale={1} className="w-full h-full bg-stone-50">
        <div className="relative" style={{ width: "1560px", height: "1320px" }}>
          <img
            src={IMAGE_URL}
            alt="Aerial view of Union Springs Cemetery"
            className="absolute rounded-md shadow-md border border-stone-200 pointer-events-none select-none"
            style={{ left: "40px", top: "40px", width: "700px", height: "900px", objectFit: "fill" }}
            draggable={false}
          />

          <div className="absolute" style={{ left: "40px", top: "40px", width: "700px", height: "900px" }}>
            <div className="inline-block origin-top-left" style={{ transform: "scale(0.32)", transformOrigin: "top left" }}>
              <Suspense fallback={<div className="flex items-center text-sm text-gray-500"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading grid…</div>}>
                <OldPlotGrid plots={plots} isAdmin={isAdmin} onHover={onHover} onEdit={onEdit} />
              </Suspense>
            </div>
          </div>
        </div>
      </ZoomPan>
    </div>
  );
}