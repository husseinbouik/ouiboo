import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}

// Trigger Vercel git deployment
