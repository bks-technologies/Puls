import type { Metadata } from "next";
import { IncidentDetail } from "@/components/incidents/incident-detail";

export const metadata: Metadata = { title: "Vorfall" };

export default async function Page({ params }: PageProps<"/incidents/[id]">) {
  const { id } = await params;
  return <IncidentDetail id={id} />;
}
