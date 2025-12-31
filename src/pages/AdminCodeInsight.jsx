import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check } from "lucide-react";

export default function AdminCodeInsight() {
  const [query, setQuery] = useState("");
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [copiedPath, setCopiedPath] = useState(null);

  // Admin gate
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 60_000,
  });

  // Build an index of all source files we can expose (read at build time as raw strings)
  // Vite will turn these into lazy loaders returning file contents as strings
  const loaders = useMemo(() => (
    import.meta.glob([
      "/Layout.js",
      "/pages/*.{js,jsx}",
      "/components/**/*.{js,jsx}",
      "/functions/*.{js}",
      "/entities/*.json",
    ], { as: "raw" })
  ), []);

  const allPaths = useMemo(() => Object.keys(loaders).sort(), [loaders]);

  const { data: results, isFetching, refetch } = useQuery({
    queryKey: ["code-insight", query],
    enabled: false,
    queryFn: async () => {
      if (!query || query.trim().length < 2) {
        return { files: [] };
      }

      // Ask AI to choose the most relevant file paths (must be EXACTLY from available list)
      const aiRes = await base44.integrations.Core.InvokeLLM({
        prompt: [
          "You help locate code files in a React (pages/, components/), functions/ (Deno backend functions), and entities/ (JSON schemas) app.",
          "Given the user's request and the exact list of available file paths below, return ONLY the paths most relevant to implement or display that section.",
          "CRITICAL: Return only exact paths from the provided list; do not invent paths.",
          "Choose up to 8 paths, ordered by relevance. If none are confident, return an empty array.",
          "User request:",
          query.trim(),
          "Available file paths (newline-separated):",
          allPaths.join("\n"),
        ].join("\n\n"),
        response_json_schema: {
          type: "object",
          properties: {
            paths: { type: "array", items: { type: "string" } },
            notes: { type: ["string", "null"] },
          },
          required: ["paths"],
        },
      });

      const aiPicked = Array.isArray(aiRes?.paths) ? aiRes.paths.filter(p => allPaths.includes(p)) : [];

      // Fallback: simple keyword ranking over file paths if AI returns nothing or too few
      const q = query.trim().toLowerCase();
      const tokens = Array.from(new Set(q.split(/[^a-z0-9]+/).filter(Boolean)));
      const rank = (p) => {
        const s = p.toLowerCase();
        let score = 0;
        if (q && s.includes(q)) score += 5;
        tokens.forEach(t => { if (s.includes(t)) score += 2; });
        if (s.includes('/pages/')) score += 2; // prefer pages first
        if (s.includes('/components/')) score += 1;
        return score;
      };
      const keywordTop = allPaths
        .slice()
        .sort((a,b) => rank(b) - rank(a))
        .slice(0, 8);

      // Combine AI + keyword picks, de-duplicate, cap to 8
      const picked = Array.from(new Set([...(aiPicked || []), ...keywordTop])).slice(0, 8);

      // Load raw code for each selected path (via Vite loaders)
      const files = [];
      for (const p of picked) {
        try {
          const code = await loaders[p]();
          files.push({ path: p, code });
        } catch (e) {
          files.push({ path: p, code: `/* Error loading file: ${e?.message || e} */` });
        }
      }
      setSelectedPaths(picked);
      return { files };
    }
  });

  const handleSearch = async () => {
    await refetch();
  };

  if (loadingUser) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-2 text-stone-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone-600">This tool is for administrators only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">Admin Code Insight</h1>
        {selectedPaths?.length ? (
          <Badge variant="secondary" className="text-stone-700">{selectedPaths.length} file(s)</Badge>
        ) : null}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-3">
            <label className="text-sm font-medium text-stone-700">Describe what you want to see</label>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. show the code for the plot map layout with tooltips, or the deceased search list"
              className="min-h-[96px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSearch} disabled={isFetching || !query.trim()} className="gap-2">
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Find Code
            </Button>
            <div className="text-xs text-stone-500">AI will select the most relevant files and display their contents below.</div>
          </div>
        </CardContent>
      </Card>

      {results?.files?.length ? (
        <div className="space-y-6">
          {results.files.map(({ path, code }) => (
            <Card key={path} className="overflow-hidden">
              <CardHeader className="flex-row items-center justify-between gap-3">
                <CardTitle className="text-base font-mono break-all">{path}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    await navigator.clipboard.writeText(code);
                    setCopiedPath(path);
                    setTimeout(() => setCopiedPath(null), 1500);
                  }}
                >
                  {copiedPath === path ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />} Copy
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto bg-stone-950 text-stone-100 text-xs">
                  <pre className="p-4 min-h-[100px] whitespace-pre leading-5">
{`// --- ${path} ---\n`}{code}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-sm text-stone-500">No results yet. Describe a section above and click Find Code.</div>
      )}
    </div>
  );
}