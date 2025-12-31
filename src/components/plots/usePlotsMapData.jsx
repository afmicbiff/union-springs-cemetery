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
  return {
    $or: [
      { section: { $in: normalized } },
      { section: { $in: withPrefixes } },
    ],
  };
}

export function usePlotsMapData({ activeTab, openSections, filterEntity }) {
  const sectionsToLoad = useMemo(() => {
    if (activeTab !== "map") return [];
    const fallback = ["5"];
    return openSections && openSections.length ? openSections : fallback;
  }, [openSections, activeTab]);

  const sectionsKey = useMemo(
    () => normalizeSectionsKey(sectionsToLoad),
    [sectionsToLoad]
  );

  return useQuery({
    queryKey: ["plotsMap", { tab: activeTab, sectionsKey }],
    enabled: activeTab === "map" && sectionsToLoad.length > 0,
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
            "first_name",
            "last_name",
            "family_name",
            "birth_date",
            "death_date",
            "notes",
            "updated_date",
          ],
          persist: true,
          ttlMs: 15 * 60_000,
        },
        { signal }
      );

      return plots || [];
    },
  });
}