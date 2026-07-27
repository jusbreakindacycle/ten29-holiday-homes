import { signOutAction } from "@/app/admin/(protected)/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="rounded-sm border border-ivory/30 px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-ivory/10"
      >
        Sign Out
      </button>
    </form>
  );
}
