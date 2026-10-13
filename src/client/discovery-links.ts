import { draftSchema } from "@/domain/bounty";
export const discoveryCategories = draftSchema.shape.category.options;
export function discoveryCategory(search: string) {
  const value = new URLSearchParams(search).get("category");
  return discoveryCategories.includes(
    value as (typeof discoveryCategories)[number],
  )
    ? value!
    : "All categories";
}
export function discoveryCategoryHref(
  category: (typeof discoveryCategories)[number],
) {
  return `/discover?${new URLSearchParams({ category })}`;
}
