import { useEffect, useMemo, useState } from "react";
import "./App.css";
import * as api from "./api";
import type { RecipeRow, UserRow } from "./types";

type Tab = "overview" | "users" | "recipes";

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`badge badge-${role}`}>{role}</span>
  );
}

function MetricCard({
  icon,
  title,
  value,
  color,
}: {
  icon: string;
  title: string;
  value: number;
  color: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon" style={{ background: color + "22", color }}>
        {icon}
      </div>
      <div className="metric-body">
        <span className="metric-value" style={{ color }}>
          {value.toLocaleString()}
        </span>
        <span className="metric-title">{title}</span>
      </div>
    </article>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-item${active ? " nav-item--active" : ""}`}
      onClick={onClick}
    >
      <span className="nav-item__icon">{icon}</span>
      <span className="nav-item__label">{label}</span>
    </button>
  );
}

export default function App() {
  const [tokenReady, setTokenReady] = useState(api.hasToken());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<{
    users: number;
    recipes: number;
    favorites: number;
  } | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");

  async function refreshAll() {
    setBusy(true);
    setError(null);
    try {
      const [me, o, u, r] = await Promise.all([
        api.fetchMe(),
        api.fetchOverview(),
        api.fetchUsers(),
        api.fetchRecipes(),
      ]);
      if (me.role !== "admin") throw new Error("This account is not an admin.");
      setOverview(o);
      setUsers(u);
      setRecipes(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setError(msg);
      if (e instanceof api.ApiError && e.status === 401) {
        api.clearToken();
        setTokenReady(false);
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (tokenReady) void refreshAll();
  }, [tokenReady]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(email, password);
      setTokenReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function onToggleRole(row: UserRow) {
    const next = row.role === "admin" ? "user" : "admin";
    setBusy(true);
    setError(null);
    try {
      await api.setUserRole(row.id, next);
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role");
      setBusy(false);
    }
  }

  async function onDeleteRecipe(id: string) {
    if (!window.confirm("Delete this recipe? This also removes its favorites.")) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteRecipe(id);
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  }

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          !userSearch ||
          u.email.toLowerCase().includes(userSearch.toLowerCase()),
      ),
    [users, userSearch],
  );

  const filteredRecipes = useMemo(
    () =>
      recipes.filter(
        (r) =>
          !recipeSearch ||
          r.title.toLowerCase().includes(recipeSearch.toLowerCase()),
      ),
    [recipes, recipeSearch],
  );

  if (!tokenReady) {
    return (
      <div className="login-bg">
        <form className="login-card" onSubmit={onLogin}>
          <div className="login-logo">
            <span className="logo-icon">🍳</span>
            <span className="logo-text">
              Taste<span className="logo-accent">AI</span>
            </span>
          </div>
          <p className="login-subtitle">Admin Dashboard</p>
          {error && <div className="alert alert-error">{error}</div>}
          <label className="field-label">Email</label>
          <input
            className="field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
            autoFocus
          />
          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <button className="btn btn-primary" disabled={busy} style={{ marginTop: 8 }}>
            {busy ? "Signing in…" : "Sign in →"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🍳</span>
          <span className="logo-text">
            Taste<span className="logo-accent">AI</span>
          </span>
        </div>

        <nav className="sidebar-nav">
          <NavItem
            icon="📊"
            label="Overview"
            active={tab === "overview"}
            onClick={() => setTab("overview")}
          />
          <NavItem
            icon="👥"
            label="Users"
            active={tab === "users"}
            onClick={() => setTab("users")}
          />
          <NavItem
            icon="🍽️"
            label="Recipes"
            active={tab === "recipes"}
            onClick={() => setTab("recipes")}
          />
        </nav>

        <div className="sidebar-footer">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => void refreshAll()}
            disabled={busy}
          >
            {busy ? "⟳ Refreshing…" : "⟳ Refresh"}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              api.clearToken();
              setTokenReady(false);
            }}
          >
            ← Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {tab === "overview" && (
          <div className="page">
            <div className="page-header">
              <h1 className="page-title">Overview</h1>
              <p className="page-sub">Platform-wide stats at a glance</p>
            </div>
            {overview ? (
              <div className="metrics-row">
                <MetricCard
                  icon="👥"
                  title="Total Users"
                  value={overview.users}
                  color="#FF6B35"
                />
                <MetricCard
                  icon="🍽️"
                  title="Total Recipes"
                  value={overview.recipes}
                  color="#00B4D8"
                />
                <MetricCard
                  icon="❤️"
                  title="Total Favorites"
                  value={overview.favorites}
                  color="#FF4D6D"
                />
              </div>
            ) : (
              <div className="loading-row">Loading stats…</div>
            )}

            {/* Quick lists */}
            <div className="two-col">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Recent Users</h2>
                  <span className="badge badge-muted">{users.length}</span>
                </div>
                <ul className="simple-list">
                  {users.slice(0, 5).map((u) => (
                    <li key={u.id} className="simple-list-item">
                      <Avatar name={u.email} size={28} />
                      <span className="list-email">{u.email}</span>
                      <RoleBadge role={u.role} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Latest Recipes</h2>
                  <span className="badge badge-muted">{recipes.length}</span>
                </div>
                <ul className="simple-list">
                  {recipes.slice(0, 5).map((r) => (
                    <li key={r.id} className="simple-list-item">
                      <span className="recipe-dot" />
                      <span className="list-email">{r.title}</span>
                      <span className="text-muted text-sm">
                        {r.tags?.slice(0, 1).join("") ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="page">
            <div className="page-header">
              <h1 className="page-title">Users</h1>
              <p className="page-sub">{users.length} total accounts</p>
            </div>
            <div className="card">
              <div className="card-header">
                <input
                  className="field-input search-input"
                  type="search"
                  placeholder="Search by email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="user-cell">
                            <Avatar name={u.email} />
                            <div>
                              <div className="cell-primary">{u.email.split("@")[0]}</div>
                              <div className="cell-secondary">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="text-muted text-sm">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => void onToggleRole(u)}
                            disabled={busy}
                          >
                            Set {u.role === "admin" ? "user" : "admin"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="empty-row">No users found</div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "recipes" && (
          <div className="page">
            <div className="page-header">
              <h1 className="page-title">Recipes</h1>
              <p className="page-sub">{recipes.length} total recipes</p>
            </div>
            <div className="card">
              <div className="card-header">
                <input
                  className="field-input search-input"
                  type="search"
                  placeholder="Search by title…"
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                />
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Tags</th>
                      <th>Updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecipes.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="cell-primary">{r.title}</div>
                          <div className="cell-secondary">
                            {r.prepMinutes != null
                              ? `${r.prepMinutes + (r.cookMinutes ?? 0)} min`
                              : "—"}
                            {r.servings != null ? ` · ${r.servings} servings` : ""}
                          </div>
                        </td>
                        <td>
                          <div className="tags-row">
                            {r.tags.slice(0, 3).map((t) => (
                              <span key={t} className="badge badge-tag">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="text-muted text-sm">
                          {new Date(r.updatedAt).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => void onDeleteRecipe(r.id)}
                            disabled={busy}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRecipes.length === 0 && (
                  <div className="empty-row">No recipes found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
