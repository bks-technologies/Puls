import type { Metadata } from "next";
import { AlertSettings } from "@/components/alerts/alert-settings";

export const metadata: Metadata = { title: "Benachrichtigungen" };

export default function Page() {
  return <AlertSettings />;
}
