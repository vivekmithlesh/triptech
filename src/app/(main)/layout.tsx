import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

// Chrome for the public + app marketing pages. /auth (full-screen) and
// /dashboard (own sidebar layout) live outside this group, so they don't
// inherit the global navbar/footer.
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
