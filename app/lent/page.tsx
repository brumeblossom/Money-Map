import { redirect } from "next/navigation";

export default function LentPage() {
  redirect("/records?tab=lent");
}
