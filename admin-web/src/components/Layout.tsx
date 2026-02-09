import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, Tag, FolderTree, List, LogOut } from "lucide-react";
import { useAuthStore } from "../stores/useAuthStore";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/brands", label: "Brands", icon: Tag },
  { href: "/taxonomies", label: "Taxonomies", icon: FolderTree },
  { href: "/taxonomy-attributes", label: "Attributes", icon: List },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
];

export function Layout() {
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex min-h-screen bg-background-light">
      <aside className="w-64 bg-white border-r border-sand-divider flex flex-col">
        <div className="p-6 border-b border-sand-divider">
          <h1 className="font-display text-xl font-bold text-text-primary">Admin</h1>
          <p className="text-sm text-text-muted mt-1">{user?.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-text-muted hover:bg-sand-divider/40"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sand-divider">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2 w-full rounded-xl text-sm font-medium text-text-muted hover:bg-sand-divider/40 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8 bg-background-light">
        <Outlet />
      </main>
    </div>
  );
}
