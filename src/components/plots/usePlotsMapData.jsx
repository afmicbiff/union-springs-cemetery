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
  ];

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
          staleTime: 15 * 60_000,
          gcTime: 30 * 60_000,
          refetchOnWindowFocus: false,
          queryFn: async ({ signal }) => {
      const sectionFilter = buildSectionFilter(sectionsToLoad);

      // 1 call total (Plot only)
      const plots = await filterEntity(
        "Plot",
        sectionFilter,
        {
          sort: "-updated_date",
          limit: 10_000,
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
            "photo_url",
            "photo_url_small",
            "photo_url_medium",
            "photo_url_large"
          ],
          persist: false,
          ttlMs: 15 * 60_000,
        },
        { signal }
      );

      return plots || [];
    },
  });
}