import type { Metadata } from "next";
import { IncidentList } from "@/components/incidents/incident-list";

export const metadata: Metadata = { title: "Vorfälle" };

export default function Page() {
  return <IncidentList />;
}
