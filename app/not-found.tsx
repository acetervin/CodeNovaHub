import Link from "next/link";
import { StatusPage } from "@/components/StatusPage";

export default function NotFound() {
  return (
    <StatusPage code="404" message="This page could not be found.">
      <p>If a CodeNova link brought you here, that project may not be shared with the email or phone you logged in with.</p>
      <Link href="/" className="font-medium text-ink underline underline-offset-4">Go to projects</Link>
    </StatusPage>
  );
}
