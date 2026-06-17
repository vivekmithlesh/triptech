import { getProfile, getUser } from "@/lib/auth";
import { NavbarClient } from "@/components/NavbarClient";
import type { UserMenuProps } from "@/components/UserMenu";

// Server component: resolves the real auth state, then hands a serializable
// user (or null) to the interactive client navbar.
export async function Navbar() {
  const user = await getUser();
  const profile = user ? await getProfile() : null;

  const navUser: UserMenuProps | null = user
    ? {
        email: user.email ?? "",
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      }
    : null;

  return <NavbarClient user={navUser} />;
}
