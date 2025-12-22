import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const FIELDS = [
  { key: "section", label: "Section", required: false },
  { key: "row_number", label: "Row", required: false },
  { key: "plot_number", label: "Plot # (Grave)", required: true },
  { key: "status", label: "Status", required: false },
  { key: "first_name", label: "First Name", required: false },
  { key: "last_name", label: "Last Name", required: false },
  { key: "family_name", label: "Family / Owner", required: false },
  { key: "birth_date", label: "Birth Date", required: false },
  { key: "death_date", label: "Death Date", required: false },
  { key: "notes", label: "Notes", required: false },
];

export default function ImportMappingDialog({
  open,
  onOpenChange,
  headers = [],
  sampleRows = [],
  initialMapping = {},
  errors = [],
  onConfirm,
  isSubmitting = false,
}) {
  const [mapping, setMapping] = React.useState(initialMapping || {});

  React.useEffect(() => {
    setMapping(initialMapping || {});
  }, [initialMapping, open]);

  const missingRequired = FIELDS.filter(f => f.required && !mapping[f.key]);

  const renderPreviewCell = (row, fieldKey) => {
    const header = mapping[fieldKey];
    if (!header) return "";
    return row[header] ?? "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Map Columns</DialogTitle>
          <DialogDescription>
            Match columns from your file to the app fields. Plot # (Grave) is required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                {f.label}
                {f.required && <span className="text-red-600 text-xs font-semibold">(required)</span>}
              </div>
              <Select
                value={mapping[f.key] || ""}
                onValueChange={(val) => setMapping((m) => ({ ...m, [f.key]: val || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not mapped" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value={null}>Not mapped</SelectItem>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">Preview (first 5 rows)</div>
          <div className="rounded border border-gray-200 overflow-hidden">
            <ScrollArea className="max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {FIELDS.map((f) => (
                      <th key={f.key} className="text-left px-3 py-2 border-b text-gray-500 font-medium">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-gray-50">
                      {FIELDS.map((f) => (
                        <td key={f.key} className="px-3 py-2 border-b text-gray-800">
                          {renderPreviewCell(row, f.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </div>

        {(errors && errors.length > 0) && (
          <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded text-sm">
            <div className="font-semibold mb-1">Validation warnings</div>
            <ul className="list-disc ml-5 space-y-0.5">
              {errors.slice(0, 8).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {errors.length > 8 && (
                <li>+ {errors.length - 8} more…</li>
              )}
            </ul>
          </div>
        )}

        {missingRequired.length > 0 && (
          <div className="mt-3 text-red-600 text-sm">
            Please map required field(s): {missingRequired.map(m => m.label).join(", ")}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button
            onClick={() => onConfirm(mapping)}
            className="bg-teal-700 hover:bg-teal-800 text-white"
            disabled={isSubmitting || missingRequired.length > 0}
          >
            {isSubmitting ? "Importing…" : "Import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}