import React, { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Play } from "lucide-react";

const ReportParams = memo(function ReportParams({ initial, onRun }) {
  const [params, setParams] = useState(initial || {});

  const handleChange = useCallback((key, value) => setParams((p) => ({ ...p, [key]: value })), []);
  const handleRun = useCallback(() => onRun(params), [onRun, params]);

  return (
    <div className="bg-white border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label className="text-xs sm:text-sm">Report Type</Label>
          <Select value={params.type} onValueChange={(v) => handleChange("type", v)}>
            <SelectTrigger className="h-9 sm:h-10 text-sm">
              <SelectValue placeholder="Choose report" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Sales Trends</SelectItem>
              <SelectItem value="plot">Plot Utilization</SelectItem>
              <SelectItem value="deceased">Deceased Demographics</SelectItem>
              <SelectItem value="predictive">Predictive Analytics</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs sm:text-sm">From</Label>
          <Input type="date" value={params.from || ""} onChange={(e) => handleChange("from", e.target.value)} className="h-9 sm:h-10 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs sm:text-sm">To</Label>
          <Input type="date" value={params.to || ""} onChange={(e) => handleChange("to", e.target.value)} className="h-9 sm:h-10 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs sm:text-sm">Granularity</Label>
          <Select value={params.granularity} onValueChange={(v) => handleChange("granularity", v)}>
            <SelectTrigger className="h-9 sm:h-10 text-sm">
              <SelectValue placeholder="Granularity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <div className="space-y-1">
          <Label className="text-xs sm:text-sm">Section (plots)</Label>
          <Input placeholder="e.g. 1" value={params.section || ""} onChange={(e) => handleChange("section", e.target.value)} className="h-9 sm:h-10 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs sm:text-sm">Invoice Status</Label>
          <Select value={params.invoiceStatus || "all"} onValueChange={(v) => handleChange("invoiceStatus", v)}>
            <SelectTrigger className="h-9 sm:h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs sm:text-sm">Veteran Only</Label>
          <div className="flex items-center gap-2 h-9 sm:h-10">
            <Switch checked={!!params.veteranOnly} onCheckedChange={(v) => handleChange("veteranOnly", v)} />
            <span className="text-xs sm:text-sm text-stone-600">Veterans</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs sm:text-sm">AI Insights</Label>
          <div className="flex items-center gap-2 h-9 sm:h-10">
            <Switch checked={!!params.ai} onCheckedChange={(v) => handleChange("ai", v)} />
            <span className="text-xs sm:text-sm text-stone-600">AI summary</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleRun} className="bg-teal-700 hover:bg-teal-800 h-9 sm:h-10 text-sm touch-manipulation">
          <Play className="w-3.5 h-3.5 mr-1.5" /> Run Report
        </Button>
      </div>
    </div>
  );
});

export default ReportParams;