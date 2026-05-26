import { redirect } from "next/navigation";

// The booking flow is route-driven by offer ID. Default to a known live offer.
export default function Home() {
  redirect("/offers/117011");
}
