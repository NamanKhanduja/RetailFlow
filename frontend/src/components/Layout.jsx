import Sidebar from './Sidebar';

export default function Layout({ title, subtitle, actions, children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="topbar-actions">{actions}</div>}
        </header>
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}
