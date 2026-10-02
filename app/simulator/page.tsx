import type { Metadata } from "next";
import { Simulator } from "@/components/simulator/simulator";

export const metadata: Metadata = { title: "Webhook-Simulator" };

export default function Page() {
  return <Simulator />;
}
