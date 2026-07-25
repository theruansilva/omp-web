import { useState } from "react";
import type { Project, Workspace, Session } from "../App";

// Minimal SVG icons matching AionUI's outline style
const FolderIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
const BranchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>;
const ChatIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const SettingsIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
const SunIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>;
const MoonIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>;

interface SiderProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (p: Project) => void;
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  onSelectWorkspace: (w: Workspace) => void;
  sessions: Session[];
  selectedSessionId: string | null;
  onSelectSession: (s: Session) => void;
  onNewSession: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function Sider({ projects, selectedProjectId, onSelectProject, workspaces, selectedWorkspaceId, onSelectWorkspace, sessions, selectedSessionId, onSelectSession, onNewSession }: SiderProps) {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark";
  });

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <nav className="sider">
      <div className="sider-header">
        <span className="sider-brand">OMP</span>
        <div className="sider-actions">
          <button className="btn-icon" title="New Chat" onClick={onNewSession} disabled={!selectedWorkspaceId}>
            <PlusIcon />
          </button>
        </div>
      </div>

      <div className="sider-scroll">
        {/* Projects */}
        {projects.length > 0 && (
          <div className="sider-section">
            <div className="sider-section-header">
              Projects <span className="sider-section-count">{projects.length}</span>
            </div>
            {projects.map((p) => (
              <div
                key={p.id}
                className={`sider-item${selectedProjectId === p.id ? " active" : ""}`}
                onClick={() => onSelectProject(p)}
              >
                <span className="sider-item-icon"><FolderIcon /></span>
                <span className="sider-item-label">{p.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Workspaces */}
        {workspaces.length > 0 && (
          <div className="sider-section">
            <div className="sider-section-header">
              Workspaces <span className="sider-section-count">{workspaces.length}</span>
            </div>
            {workspaces.map((w) => (
              <div
                key={w.id}
                className={`sider-item${selectedWorkspaceId === w.id ? " active" : ""}`}
                onClick={() => onSelectWorkspace(w)}
              >
                <span className="sider-item-icon"><BranchIcon /></span>
                <span className="sider-item-label">{w.label}</span>
                {w.branch && <span className="sider-item-meta">{w.branch}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Sessions */}
        {sessions.length > 0 && (
          <div className="sider-section">
            <div className="sider-section-header">
              Sessions <span className="sider-section-count">{sessions.length}</span>
            </div>
            {sessions.filter((s) => !s.archived).slice(0, 50).map((s) => (
              <div
                key={s.id}
                className={`sider-item${selectedSessionId === s.id ? " active" : ""}`}
                onClick={() => onSelectSession(s)}
              >
                <span className="sider-item-icon"><ChatIcon /></span>
                <span className="sider-item-label">{s.name || s.firstMessage || s.id.slice(0, 8)}</span>
                <span className="sider-item-meta">{formatRelativeTime(s.modified)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!selectedProjectId && projects.length === 0 && (
          <div className="empty-state" style={{ padding: "40px 16px" }}>
            <div className="empty-state-icon"><FolderIcon /></div>
            <p style={{ fontSize: "12px", textAlign: "center" }}>No projects registered.</p>
          </div>
        )}
      </div>

      <div className="sider-footer">
        <button className="sider-footer-btn" onClick={toggleTheme}>
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>
        <button className="sider-footer-btn">
          <SettingsIcon />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
}
