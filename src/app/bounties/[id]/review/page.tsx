import { Details } from "@/components/details";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Details id={(await params).id} review />;
}
