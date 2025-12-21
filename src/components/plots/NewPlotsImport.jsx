import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

function mapRowToEntity(row) {
  // Accept keys in various casings
  const get = (k) => row[k] ?? row[k?.toLowerCase?.()] ?? row[k?.toUpperCase?.()];
  return {
    section: get("Section") || get("section"),
    row_number: get("Row") || get("row") || get("Row Number"),
    plot_number: get("Grave") || get("grave") || get("Plot") || get("plot_number"),
    status: get("Status") || get("status"),
    first_name: get("First Name") || get("first_name") || get("First") || get("FirstName"),
    last_name: get("Last Name") || get("last_name") || get("Last") || get("LastName"),
    family_name: get("Family Name") || get("family_name") || get("Owner") || get("Owner Name"),
    birth_date: get("Birth") || get("birth_date") || get("DOB"),
    death_date: get("Death") || get("death_date") || get("DOD"),
    notes: get("Notes") || get("notes") || get("Note"),
  };
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  let headerIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const l = lines[i].toLowerCase();
    if (l.includes("grave") && l.includes("status")) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) headerIndex = 0; // fallback first row as header

  const headers = lines[headerIndex].split(",").map((h) => h.trim());
  const out = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === "," && !inQuotes) { values.push(current.trim().replace(/^"|"$/g, "")); current = ""; }
      else current += ch;
    }
    values.push(current.trim().replace(/^"|"$/g, ""));
    const row = {};
    headers.forEach((h, idx) => (row[h] = values[idx] || ""));
    const mapped = mapRowToEntity(row);
    if (mapped.plot_number) out.push(mapped);
  }
  return out;
}

export default function NewPlotsImport() {
  const csvInputRef = useRef(null);
  const xlsInputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const sendToBackend = async (plots) => {
    if (!plots?.length) {
      toast.error("No valid rows found.");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("importPlots", { plots });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(res.data?.message || `Imported ${plots.length} plots successfully`);
    } catch (e) {
      toast.error(e.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const onCSVSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target?.result || "");
      const plots = parseCSV(text);
      sendToBackend(plots);
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  };

  const onExcelSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const plots = rows.map(mapRowToEntity).filter((r) => r.plot_number);
      sendToBackend(plots);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ""; // reset
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={onCSVSelected} />
      <input ref={xlsInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onExcelSelected} />

      <Button
        size="sm"
        className="bg-teal-700 hover:bg-teal-800 text-white"
        onClick={() => csvInputRef.current?.click()}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
        Import CSV
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="border-teal-700 text-teal-700 hover:bg-teal-50"
        onClick={() => xlsInputRef.current?.click()}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
        Import Excel
      </Button>
    </div>
  );
}