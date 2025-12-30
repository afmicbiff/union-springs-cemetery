import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function ReportParams({ initial, onRun }) {
  const [params, setParams] = React.useState(initial || {});

  const handleChange = (key, value) => setParams((p) => ({ ...p, [key]: value }));

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label>Report Type</Label>
          <Select value={params.type} onValueChange={(v) => handleChange("type", v)}>
            <SelectTrigger>
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
          <Label>From</Label>
          <Input type="date" value={params.from || ""} onChange={(e) => handleChange("from", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={params.to || ""} onChange={(e) => handleChange("to", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Granularity</Label>
          <Select value={params.granularity} onValueChange={(v) => handleChange("granularity", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Granularity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label>Section (plots)</Label>
          <Input placeholder="e.g. 1" value={params.section || ""} onChange={(e) => handleChange("section", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Invoice Status</Label>
          <Select value={params.invoiceStatus || "all"} onValueChange={(v) => handleChange("invoiceStatus", v)}>
            <SelectTrigger>
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
          <Label>Veteran Only (deceased)</Label>
          <div className="flex items-center gap-3 h-10">
            <Switch checked={!!params.veteranOnly} onCheckedChange={(v) => handleChange("veteranOnly", v)} />
            <span className="text-sm text-stone-600">Filter veterans</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label>AI Insights</Label>
          <div className="flex items-center gap-3 h-10">
            <Switch checked={!!params.ai} onCheckedChange={(v) => handleChange("ai", v)} />
            <span className="text-sm text-stone-600">Generate AI summary</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => onRun(params)} className="bg-teal-700 hover:bg-teal-800">Run Report</Button>
      </div>
    </div>
  );
}