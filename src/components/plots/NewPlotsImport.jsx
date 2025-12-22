import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import ImportMappingDialog from "./ImportMappingDialog";

function mapRowToEntity(row, mapping) {
  const valFromMapping = (fieldKey) => {
    const header = mapping?.[fieldKey];
    if (!header) return undefined;
    return row[header] ?? row[header?.toLowerCase?.()] ?? row[header?.toUpperCase?.()];
  };

  const getSynonym = (keys) => {
    for (const k of keys) {
      const v = row[k] ?? row[k?.toLowerCase?.()] ?? row[k?.toUpperCase?.()];
      if (v != null && String(v).length > 0) return v;
    }
    return undefined;
  };

  const section = valFromMapping("section") ?? getSynonym(["Section","section"]);
  const row_number = valFromMapping("row_number") ?? getSynonym(["Row","row","Row Number"]);
  const plot_number = valFromMapping("plot_number") ?? getSynonym(["Grave","grave","Plot","plot_number","Plot Number","Plot #"]);
  const status = valFromMapping("status") ?? getSynonym(["Status","status"]);
  const first_name = valFromMapping("first_name") ?? getSynonym(["First Name","first_name","First","FirstName"]);
  const last_name = valFromMapping("last_name") ?? getSynonym(["Last Name","last_name","Last","LastName"]);
  const family_name = valFromMapping("family_name") ?? getSynonym(["Family Name","family_name","Owner","Owner Name"]);
  const birth_date = valFromMapping("birth_date") ?? getSynonym(["Birth","birth_date","DOB"]);
  const death_date = valFromMapping("death_date") ?? getSynonym(["Death","death_date","DOD"]);
  const notes = valFromMapping("notes") ?? getSynonym(["Notes","notes","Note"]);

  return {
    section,
    row_number,
    plot_number,
    status,
    first_name,
    last_name,
    family_name,
    birth_date,
    death_date,
    notes,
  };
}

function splitLine(line, delimiter) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (ch === '"') {
      if (inQuotes && line[j+1] === '"') { // escaped quote
        current += '"';
        j++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      values.push(current.trim().replace(/^\"|\"$/g, ""));
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current.trim().replace(/^\"|\"$/g, ""));
  return values;
}

function detectDelimiter(headerLine) {
  const candidates = [",",";","\t","|"];
  let best = { d: ",", count: -1 };
  for (const d of candidates) {
    const count = (headerLine.match(new RegExp(`\\${d}`, 'g')) || []).length;
    if (count > best.count) best = { d, count };
  }
  return best.d;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headerLine = lines[0];
  const delimiter = detectDelimiter(headerLine);
  const headers = splitLine(headerLine, delimiter);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = splitLine(line, delimiter);
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
    rows.push(row);
  }
  return rows;
}

export default function NewPlotsImport() {
  const csvInputRef = useRef(null);
  const xlsInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [initialMapping, setInitialMapping] = useState({});
  const [mappingErrors, setMappingErrors] = useState([]);
  const rowsRawRef = useRef([]);

  const FIELD_SYNONYMS = {
    section: ["section","Section"],
    row_number: ["row","Row","Row Number","RowNumber"],
    plot_number: ["grave","Grave","plot","Plot","Plot Number","Plot #","plot_number"],
    status: ["status","Status"],
    first_name: ["first name","First Name","first","First","FirstName"],
    last_name: ["last name","Last Name","last","Last","LastName","Surname"],
    family_name: ["family name","Family Name","owner","Owner","Owner Name","Family"],
    birth_date: ["birth","Birth","DOB","Date of Birth","birth_date"],
    death_date: ["death","Death","DOD","Date of Death","death_date"],
    notes: ["notes","Notes","Note","Remarks"],
  };

  const normalize = (s) => String(s || "").trim().toLowerCase().replace(/[\s._-]+/g, " ");

  const autoSuggestMapping = (headers) => {
    const mapping = {};
    const normHeaders = headers.map((h) => ({ raw: h, norm: normalize(h) }));
    Object.entries(FIELD_SYNONYMS).forEach(([field, synonyms]) => {
      const synNorm = synonyms.map(normalize);
      const found = normHeaders.find(h => synNorm.includes(h.norm));
      if (found) mapping[field] = found.raw;
    });
    return mapping;
  };

  const VALID_STATUSES = new Set(["Available","Reserved","Occupied","Veteran","Unavailable","Unknown","Not Usable"]);

  const normalizeStatus = (val) => {
    if (!val) return undefined;
    const s = String(val).trim().toLowerCase();
    if (["available","open"].includes(s)) return "Available";
    if (["reserved","hold","on hold"].includes(s)) return "Reserved";
    if (["occupied","occ","taken","filled"].includes(s)) return "Occupied";
    if (["veteran","vet","military"].includes(s)) return "Veteran";
    if (["unavailable","blocked","na","n/a"].includes(s)) return "Unavailable";
    if (["unknown","unk"].includes(s)) return "Unknown";
    if (["not usable","notusable","unusable"].includes(s)) return "Not Usable";
    return s.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ");
  };

  const looksLikeDate = (s) => {
    if (!s) return false;
    const str = String(s).trim();
    if (!/[0-9]/.test(str)) return false;
    return /[\/\-\.]/.test(str) || /^\d{4}$/.test(str);
  };

  const validateMappedRows = (rows) => {
    const errors = [];
    const cleaned = rows.map((r, idx) => {
      const rowNum = idx + 1;
      const out = { ...r };
      if (!out.plot_number || String(out.plot_number).trim() === "") {
        errors.push(`Row ${rowNum}: Missing required Plot #`);
      }
      if (out.status != null) {
        const st = normalizeStatus(out.status);
        out.status = st;
        if (st && !VALID_STATUSES.has(st)) {
          errors.push(`Row ${rowNum}: Invalid status '${out.status}'`);
        }
      }
      if (out.birth_date && !looksLikeDate(out.birth_date)) {
        errors.push(`Row ${rowNum}: Birth Date seems invalid ('${out.birth_date}')`);
      }
      if (out.death_date && !looksLikeDate(out.death_date)) {
        errors.push(`Row ${rowNum}: Death Date seems invalid ('${out.death_date}')`);
      }
      return out;
    });
    return { errors, cleanedRows: cleaned };
  };

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
      const rows = parseCSV(text); // raw rows as objects keyed by headers
      if (!rows || rows.length === 0) {
        toast.error("No data rows found in file.");
        return;
      }
      const headers = Object.keys(rows[0] || {});
      rowsRawRef.current = rows;
      setFileHeaders(headers);
      setSampleRows(rows.slice(0, 10));
      setInitialMapping(autoSuggestMapping(headers));
      setMappingErrors([]);
      setMappingOpen(true);
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
      if (!rows || rows.length === 0) {
        toast.error("No data rows found in sheet.");
        return;
      }
      const headers = Object.keys(rows[0] || {});
      rowsRawRef.current = rows;
      setFileHeaders(headers);
      setSampleRows(rows.slice(0, 10));
      setInitialMapping(autoSuggestMapping(headers));
      setMappingErrors([]);
      setMappingOpen(true);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ""; // reset
  };

  const handleConfirmMapping = (mapping) => {
    const mapped = rowsRawRef.current.map((row) => mapRowToEntity(row, mapping));
    const filtered = mapped.filter((r) => r && (r.plot_number != null));
    const { errors, cleanedRows } = validateMappedRows(filtered);
    if (errors.length > 0) {
      setMappingErrors(errors);
      toast.error(`Found ${errors.length} validation issue(s). Fix mapping or file and try again.`);
      return;
    }
    setMappingOpen(false);
    sendToBackend(cleanedRows);
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={csvInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={onCSVSelected} />
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

      <ImportMappingDialog
        open={mappingOpen}
        onOpenChange={setMappingOpen}
        headers={fileHeaders}
        sampleRows={sampleRows}
        initialMapping={initialMapping}
        errors={mappingErrors}
        onConfirm={handleConfirmMapping}
        isSubmitting={loading}
      />

    </div>
  );
}