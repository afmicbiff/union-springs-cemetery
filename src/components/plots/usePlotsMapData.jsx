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
  // Fetch ALL plots regardless of section — the grid positions them by row_number
  return {};
}

export function usePlotsMapData({ activeTab, openSections, filterEntity }) {
  const sectionsToLoad = useMemo(() => {
    if (activeTab !== "map") return [];
    const fallback = ["1", "2", "3", "5"];
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