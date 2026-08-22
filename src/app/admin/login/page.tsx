import { redirect } from "next/navigation";
import { hasSession } from "@/lib/admin-auth";
import { loginAction } from "../actions";
import { ActionForm } from "../action-form";
import { Field } from "../ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await hasSession()) redirect("/admin");
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <p className="spec">MUD Naturals</p>
        <h1 className="mt-1 font-sans text-xl font-semibold tracking-tight">Operations console</h1>
        <p className="mt-2 text-sm text-ink-2">
          One shared password for the team. Sessions last seven days.
        </p>

        <ActionForm action={loginAction} submitLabel="Sign in" variant="primary" size="md" className="mt-6">
          <input type="hidden" name="next" value={next ?? "/admin"} />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
          />
        </ActionForm>
      </div>
    </div>
  );
}
