import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Sends someone back to `to` with a message for the Flash banner. The text rides in a one-minute cookie only
 *  the server can write, not in the address, so a link can't put words in the hub's mouth and a refresh or an
 *  old tab doesn't show it again. The address only gets ?flash=1, which the banner removes once it's shown. */
export async function redirectWithFlash(to: string, message: string): Promise<never> {
  (await cookies()).set("flash", message, { path: "/", maxAge: 60, sameSite: "lax" });
  redirect(`${to}?flash=1`);
}
