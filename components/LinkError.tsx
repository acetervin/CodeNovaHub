"use client";
import { useEffect, useState } from "react";

// Supabase reports a failed login link after "#" in the address, which never reaches the server.
export function LinkError() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (!hash.get("error")) return;
    setMessage(hash.get("error_code") === "otp_expired"
      ? "That link has expired or was already used. Ask for a new one below."
      : `That link didn't work: ${hash.get("error_description") ?? hash.get("error")}. Ask for a new one below.`);
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);
  return message ? <p role="alert" className="mt-4 text-sm text-danger">{message}</p> : null;
}
