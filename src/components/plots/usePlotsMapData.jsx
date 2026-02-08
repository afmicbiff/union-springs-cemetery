import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

// Keep key stable even if section order changes
function normalizeSectionsKey(sections) {
  return (sections || [])
    .map(String)
    .map((s) => s.replace(/Section\s*/i, "").trim())
    .filter(Boolean)
    .sort()
    .join(",");
}

// Choose one filter style that matches Base44
function buildSectionFilter(sectionsToLoad) {
  const normalized = (sectionsToLoad || [])
    .map((s) => String(s).replace(/Section\s*/i, "").trim())
    .filter(Boolean);
  // Support both raw numbers ("5") and prefixed values ("Section 5")
  const withPrefixes = normalized.map((n) => `Section ${n}`);

  const orClauses = [
    { section: { $in: normalized } },
    { section: { $in: withPrefixes } },
    // Include plots with null/empty section (data hygiene fallback)
    { section: null },
    { section: "" },
  ];

  // Section 3 plot number ranges (from Plots.js SectionRenderer)
  if (normalized.includes('3')) {
    const ranges = [
      [251, 268], [326, 348], [406, 430], [489, 512],
      [605, 633], [688, 711], [765, 788], [821, 843], [898, 930]
    ];
    const seq = [];
    ranges.forEach(([start, end]) => {
      for (let i = start; i <= end; i++) seq.push(String(i));
    });
    orClauses.push({ plot_number: { $in: seq } });
  }

  // Ensure Section 4 also pulls key ranges regardless of recorded section (data hygiene fallback)
  if (normalized.includes('4')) {
    const seqA = Array.from({ length: 542 - 513 + 1 }, (_, i) => String(513 + i));
    const seqB = Array.from({ length: 559 - 548 + 1 }, (_, i) => String(548 + i));
    const seqC = Array.from({ length: 562 - 560 + 1 }, (_, i) => String(560 + i));
    const seqD = Array.from({ length: 576 - 564 + 1 }, (_, i) => String(564 + i));
    const seq = [...seqA, ...seqB, ...seqC, ...seqD];
    orClauses.push({ plot_number: { $in: seq } });
  }

  return { $or: orClauses };
}

export function usePlotsMapData({ activeTab, openSections, filterEntity }) {
  const sectionsToLoad = useMemo(() => {
    if (activeTab !== "map") return [];
    const fallback = ["1", "2", "3", "4", "5"];
    return openSections && openSections.length ? openSections : fallback;
  }, [openSections, activeTab]);

  const sectionsKey = useMemo(
    () => normalizeSectionsKey(sectionsToLoad),
    [sectionsToLoad]
  );

  return useQuery({
          queryKey: ["plotsMap_v3_all", { tab: activeTab, sectionsKey }],
          enabled: activeTab === "map",
          staleTime: 2 * 60_000, // 2 min stale time for better caching
          gcTime: 10 * 60_000,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          queryFn: async ({ signal }) => {
      const sectionFilter = buildSectionFilter(sectionsToLoad);

      // 1 call total (Plot only) - reduced payload for mobile
      const plots = await filterEntity(
        "Plot",
        sectionFilter,
        {
          sort: "-updated_date",
          limit: 3000, // Reduced from 10K for mobile performance
          select: [
            "id",
            "section",
            "row_number",
            "plot_number",
            "status",
            "notes",
            "first_name",
            "last_name",
            "family_name",
            "birth_date",
            "death_date",
            "photo_url_small" // Only small thumbnail for tooltips
          ],
          persist: false,
          ttlMs: 60_000, // 1 min cache
        },
        { signal }
      );

      return plots || [];
    },
  });
}