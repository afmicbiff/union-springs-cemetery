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
  // Option A: Mongo style
  return { section: { $in: sectionsToLoad } };

  // Option B: "in" style
  // return { section: { in: sectionsToLoad } };

  // Option C: OR list style
  // return { OR: sectionsToLoad.map(sec => ({ section: sec })) };
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

      // 2 calls total, always
      const [plots, legacy] = await Promise.all([
        filterEntity(
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
        ),
        filterEntity(
          "PlotsAndMaps",
          sectionFilter,
          {
            sort: "-updated_date",
            limit: 10_000,
            select: [
              "id",
              "section",
              "row",
              "grave",
              "status",
              "first_name",
              "last_name",
              "family_name",
              "birth",
              "death",
              "notes",
              "updated_date",
            ],
            persist: true,
            ttlMs: 15 * 60_000,
          },
          { signal }
        ),
      ]);

      return [...(plots || []), ...(legacy || [])];
    },
  });
}