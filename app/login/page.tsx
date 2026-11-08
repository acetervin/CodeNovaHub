import { LinkError } from "@/components/LinkError";
import { Submit } from "@/components/Submit";
import { Icon, Mark } from "@/components/icons";
import { control } from "@/components/fields";
import { sendLink } from "./actions";

const errors: Record<string, string> = {
  email: "That doesn't look like an email address.",
  send: "We couldn't send the link just now. Try again in a minute.",
  link: "That link has expired or was already used. Ask for a new one.",
};

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { sent, error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-card bg-card p-6 sm:p-8">
        <span className="grid size-12 place-items-center rounded-full bg-nova text-white"><Mark /></span>
        <h1 className="mt-6 text-[2rem] font-semibold leading-[1.12] tracking-[-0.025em]">
          Hey there, <span aria-hidden>👋</span>
          <span className="block text-faint">Follow your <span className="text-nova">project.</span></span>
        </h1>
        <LinkError />
        {sent ? (
          <p className="mt-6 rounded-2xl bg-paper px-4 py-3 text-muted">
            If that email is on one of our projects, a login link is on its way. It works once, on any device.
          </p>
        ) : (
          <form action={sendLink} className="mt-6 flex flex-col gap-3">
            <label htmlFor="email" className="px-1 text-sm text-muted">Your email</label>
            <input id="email" name="email" type="email" required autoComplete="email" autoCapitalize="none" enterKeyHint="send" className={control} />
            {typeof error === "string" && errors[error] && <p role="alert" className="px-1 text-sm text-danger">{errors[error]}</p>}
            <Submit pending="Sending…" className="mt-1 !py-3.5">Email me a login link</Submit>
          </form>
        )}
      </div>
      <p className="mt-5 flex items-start gap-2 px-2 text-sm text-muted">
        <Icon name="shield" className="mt-0.5 size-4 shrink-0 text-ok" />
        No passwords. Each link signs you in once, and you only see your own projects.
      </p>
    </main>
  );
}
