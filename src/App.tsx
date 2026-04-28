import React, { useContext, useEffect, useMemo, useState } from 'react';
import { 
  Orbit, 
  LayoutDashboard, 
  CalendarClock, 
  Layers, 
  MessageSquare, 
  Bell, 
  Settings, 
  Search, 
  Plus, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  UserPlus, 
  Sparkles, 
  AlertOctagon, 
  Cloud, 
  Database, 
  Terminal, 
  Mail, 
  History, 
  Circle,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Send,
  Paperclip,
  TrendingUp,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { addDoc, collection, getDocs } from "firebase/firestore";
import { db, auth, googleProvider } from "./firebase";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import {
  chatWithAI,
  chatWithAIStream,
  draftFollowUp,
  getDailyBriefing,
  getDeadlineWarning,
  getPreCallBriefing,
  getStackAlerts,
} from "./aiService";

/**
 * Orbit: A high-fidelity dashboard for founders.
 */

// --- Shared Components ---

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}

const GlassCard = ({ children, className = "", ...props }: GlassCardProps) => (
  <div className={`glass-card rounded-xl p-6 ${className}`} {...props}>
    {children}
  </div>
);

const LoadingSpinner = ({ label = "Loading..." }: { label?: string }) => {
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSlowHint(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 text-slate-400">
      <div className="w-4 h-4 rounded-full border-2 border-white/10 border-t-primary animate-spin" />
      <span className="text-xs font-bold uppercase tracking-widest">
        {showSlowHint ? "Still thinking... network may be slow" : label}
      </span>
    </div>
  );
};

const SkeletonLine = ({ w = "w-full" }: { w?: string }) => (
  <div className={`h-3 ${w} rounded bg-white/10 animate-pulse`} />
);

const SkeletonCard = () => (
  <div className="rounded-xl bg-white/5 border border-white/10 p-4 animate-pulse">
    <div className="h-4 w-40 rounded bg-white/10" />
    <div className="mt-3 space-y-2">
      <div className="h-3 w-full rounded bg-white/10" />
      <div className="h-3 w-5/6 rounded bg-white/10" />
      <div className="h-3 w-2/3 rounded bg-white/10" />
    </div>
  </div>
);

const AIErrorCard = () => (
  <div className="glass-card rounded-2xl p-6 border border-white/5">
    <p className="text-on-surface-variant font-medium">
      Orbit could not load AI response, please try again
    </p>
  </div>
);

const AuthErrorCard = ({ message }: { message: string }) => (
  <div className="glass-card rounded-2xl p-6 border border-white/5">
    <p className="text-on-surface-variant font-medium">{message}</p>
  </div>
);

type WithId<T> = T & { id: string };

type ContactDoc = {
  name?: string;
  company?: string;
  type?: string;
  role?: string;
  notes?: string;
  promises?: string;
  lastContact?: any;
  status?: string;
  lastContactedAt?: any;
  lastContacted?: any;
  lastInteractionAt?: any;
  lastInteraction?: any;
  daysSince?: number;
};

type StackAlertDoc = {
  tool?: string;
  type?: string;
  message?: string;
  severity?: string;
  action?: string;
};

type DecisionDoc = {
  text?: string;
  date?: string;
  title?: string;
  decision?: string;
  deadline?: any;
  dueDate?: any;
  dueAt?: any;
  daysRemaining?: number;
  createdAt?: any;
};

function toDateMaybe(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v?.toDate === "function") return v.toDate();
  if (typeof v?.seconds === "number") return new Date(v.seconds * 1000);
  return null;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function relativeDayLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due in ${days}d`;
}

function decisionDueDate(decision: DecisionDoc): Date | null {
  return toDateMaybe(decision.deadline ?? decision.dueDate ?? decision.dueAt);
}

function decisionDaysRemaining(decision: DecisionDoc): number | null {
  if (typeof decision.daysRemaining === "number") return decision.daysRemaining;
  const due = decisionDueDate(decision);
  if (!due) return null;
  const today = startOfDay(new Date());
  return Math.ceil((startOfDay(due).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function decisionDueLabel(decision: DecisionDoc, now = new Date()): string | null {
  const due = decisionDueDate(decision);
  if (!due) return null;
  const diffMs = due.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (Math.abs(diffMinutes) < 60) {
    if (diffMinutes < 0) return `${Math.abs(diffMinutes)}m overdue`;
    if (diffMinutes === 0) return "due now";
    return `due in ${diffMinutes}m`;
  }
  const diffHours = Math.round(diffMs / 3600000);
  if (Math.abs(diffHours) < 24) {
    if (diffHours < 0) return `${Math.abs(diffHours)}h overdue`;
    return `due in ${diffHours}h`;
  }
  const days = decisionDaysRemaining(decision);
  return typeof days === "number" ? relativeDayLabel(days) : null;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 15000): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`AI request timed out after ${timeoutMs / 1000}s`)), timeoutMs)
    ),
  ]);
}

function buildFounderSnapshot(
  contacts: Array<any>,
  stackAlerts: Array<any>,
  decisions: Array<any>
) {
  return {
    contacts: contacts.slice(0, 12).map((c) => ({
      name: c.name ?? "",
      role: c.role ?? c.type ?? "",
      status: c.status ?? "",
      daysSince: c.daysSince ?? null,
      notes: String(c.notes ?? "").slice(0, 140),
    })),
    stackAlerts: stackAlerts.slice(0, 8).map((a) => ({
      tool: a.tool ?? "",
      severity: a.severity ?? "",
      message: String(a.message ?? "").slice(0, 140),
      action: String(a.action ?? "").slice(0, 120),
    })),
    decisions: decisions.slice(0, 8).map((d) => ({
      text: d.text ?? d.title ?? d.decision ?? "",
      deadline: d.deadline ?? d.dueDate ?? d.dueAt ?? null,
      daysRemaining: d.daysRemaining ?? null,
      tag: d.tag ?? "",
    })),
  };
}

function formatFirebaseAuthError(err: any, mode: "signin" | "signup" = "signin"): string {
  const code = String(err?.code ?? "");
  if (code.includes("popup-blocked")) return "Popup blocked. Please allow popups and try again.";
  if (code.includes("popup-closed")) return "Google sign-in popup was closed before completing.";
  if (code.includes("unauthorized-domain")) return "This domain is not authorized in Firebase Authentication.";
  if (code.includes("operation-not-allowed")) return "Enable this sign-in method in Firebase Authentication.";
  if (code.includes("invalid-credential") || code.includes("invalid-login-credentials")) {
    return mode === "signin"
      ? "Incorrect email or password. Please try again."
      : "Could not create account with these credentials. Please try again.";
  }
  if (code.includes("wrong-password")) return "Incorrect password.";
  if (code.includes("user-not-found")) {
    return mode === "signin"
      ? "No account found with this email. Please sign up first."
      : "No account found with this email. Please sign in instead.";
  }
  if (code.includes("email-already-in-use")) return "An account already exists with this email. Please sign in instead.";
  if (code.includes("invalid-email")) return "Please enter a valid email address.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please wait a minute and try again.";
  if (code.includes("network-request-failed")) return "Network error. Check your internet connection and try again.";
  return "Orbit could not sign you in, please try again";
}

async function fetchCollection<T>(name: string): Promise<Array<WithId<T>>> {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

async function fetchFirstAvailableCollection<T>(
  names: string[]
): Promise<Array<WithId<T>>> {
  let lastErr: unknown = null;
  for (const name of names) {
    try {
      return await fetchCollection<T>(name);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("No collection available");
}

const Sidebar = ({ currentTab, onTabChange, user }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'follow-ups', label: 'Follow-ups', icon: CalendarClock },
    { id: 'stack-monitor', label: 'Stack Monitor', icon: Layers },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md flex flex-col z-40">
      <div className="p-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center ai-glow">
          <Orbit className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tighter text-white uppercase">Orbit</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#7c3aed] font-bold">Founder Intel</p>
        </div>
      </div>

      <nav className="flex-1 mt-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center gap-3 px-6 py-3 transition-all cursor-pointer ${
              currentTab === tab.id 
                ? 'text-primary bg-primary-container/10 border-r-2 border-primary' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className={`w-5 h-5 ${currentTab === tab.id ? 'fill-primary/20' : ''}`} />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-white/10">
        <div className="flex items-center gap-3 p-3 glass-card rounded-xl">
          <img 
            src={user?.photoURL ?? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64"} 
            alt={user?.displayName ?? "User"}
            className="w-10 h-10 rounded-full border border-primary/20"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64";
            }}
          />
          <div className="overflow-hidden">
            <p className="text-white font-bold truncate">{user?.displayName ?? "Founder"}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email ?? "Pro Plan"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 ml-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#7c3aed]" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">AI Core Active</span>
        </div>
      </div>
    </aside>
  );
};

const TopBar = ({
  onOpenSettings,
  user,
  searchQuery,
  onSearchQueryChange,
  notifications,
  unreadCount,
}: {
  onOpenSettings: () => void;
  user: any;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  notifications: Array<{ title: string; desc: string; time: string }>;
  unreadCount: number;
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-[#0a0a0f]/60 backdrop-blur-lg border-b border-white/10 flex items-center justify-between px-6 z-30">
      <div className="flex-1 max-w-md">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search intel..." 
            className="w-full bg-[#16161e] border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all text-on-surface"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Real-time processing</span>
        </div>
        <div className="flex items-center gap-3 p-2 pl-3 glass-card rounded-full border border-white/10">
          <img
            src={user?.photoURL ?? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64"}
            alt={user?.displayName ?? "User"}
            className="w-7 h-7 rounded-full border border-primary/20"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64";
            }}
          />
          <div className="leading-tight pr-2">
            <p className="text-[11px] font-bold text-white truncate max-w-[120px]">
              {user?.displayName ?? "Founder"}
            </p>
            <p className="text-[9px] font-bold text-slate-500 truncate max-w-[120px]">
              {user?.email ?? ""}
            </p>
          </div>
        </div>
        <div className="relative">
          <button
            className="p-2 hover:bg-white/5 rounded-full transition-colors relative text-slate-400 hover:text-white cursor-pointer"
            onClick={() => setNotifOpen((p) => !p)}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-5 h-5 px-1.5 bg-primary rounded-full border-2 border-[#0a0a0f] text-[10px] leading-none text-white font-black flex items-center justify-center shadow-[0_0_10px_rgba(124,58,237,0.55)]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-[420px] max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 p-3 z-50 bg-[#0b0b12]/95 backdrop-blur-xl shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between px-2 pb-2 border-b border-white/10">
                <p className="text-xs font-bold uppercase tracking-widest text-white">Notifications</p>
                <button
                  className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                  onClick={() => setNotifOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {notifications.length ? (
                  notifications.map((n, i) => (
                    <div key={`${n.title}-${i}`} className="rounded-xl bg-[#111225] border border-white/10 p-4">
                      <p className="text-sm font-semibold text-white">{n.title}</p>
                      <p className="text-xs text-slate-200/80 mt-1 leading-relaxed">{n.desc}</p>
                      <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest">{n.time}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 p-2">No new notifications.</p>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white cursor-pointer"
          onClick={onOpenSettings}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

const AuthView = ({
  onAuthed,
}: {
  onAuthed?: () => void;
}) => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Handles redirect-based Google sign-in result when popup fails.
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) onAuthed?.();
      })
      .catch((err) => setError(formatFirebaseAuthError(err, mode)));
  }, [onAuthed, mode]);

  const doGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onAuthed?.();
    } catch (err: any) {
      // Fallback for popup blockers and strict browser policies.
      if (String(err?.code ?? "").includes("popup")) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          setError(formatFirebaseAuthError(redirectErr, mode));
        }
      } else {
        setError(formatFirebaseAuthError(err, mode));
      }
    } finally {
      setLoading(false);
    }
  };

  const doEmail = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onAuthed?.();
    } catch (err) {
      setError(formatFirebaseAuthError(err, mode));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface selection:bg-[#7c3aed]/30 scroll-smooth no-scrollbar flex items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="glass-card rounded-2xl p-8 border-white/5 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center ai-glow">
              <Orbit className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase">Orbit</h1>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Founder Intel</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <button
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
                mode === "signin"
                  ? "bg-primary text-on-primary"
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
              onClick={() => setMode("signin")}
              disabled={loading}
            >
              Sign in
            </button>
            <button
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
                mode === "signup"
                  ? "bg-primary text-on-primary"
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
              onClick={() => setMode("signup")}
              disabled={loading}
            >
              Create account
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#16161e] border border-white/10 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all text-on-surface"
                placeholder="you@company.com"
                disabled={loading}
              />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Password</p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#16161e] border border-white/10 rounded-lg py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all text-on-surface"
                placeholder="••••••••"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doEmail();
                }}
              />
            </div>

            <button
              className="w-full py-4 bg-primary-container text-white font-bold rounded-xl ai-glow transition-transform active:scale-[0.98] hover:brightness-110 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={doEmail}
              disabled={loading || !email.trim() || password.length < 6}
            >
              {loading ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
            </button>

            <div className="flex items-center gap-4 py-2">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">or</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <button
              className="w-full py-4 bg-white text-[#0a0a0f] rounded-xl font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={doGoogle}
              disabled={loading}
            >
              Continue with Google
            </button>
          </div>
        </div>

        {error && <AuthErrorCard message={error} />}
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const SettingsPanel = ({
  open,
  onClose,
  user,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  user: any;
  onSignOut: () => void;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute top-20 right-8 w-[420px] max-w-[calc(100vw-64px)] glass-card rounded-2xl p-8 border border-white/10 shadow-2xl">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Settings</p>
            <h3 className="text-2xl font-bold text-white">Orbit Account</h3>
            <p className="text-on-surface-variant mt-2 font-medium">
              {user?.email ?? "Signed in"}
            </p>
          </div>
          <button
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white cursor-pointer"
            onClick={onClose}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6 border border-white/5">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Profile</p>
            <p className="text-sm text-white font-bold truncate">{user?.displayName ?? "Founder"}</p>
            <p className="text-xs text-slate-500 mt-1 truncate">{user?.email ?? ""}</p>
          </div>

          <button
            className="w-full py-4 bg-white text-[#0a0a0f] rounded-xl font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl cursor-pointer"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

const ContactFormPanel = ({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; role: string; notes: string }) => Promise<void>;
}) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Lead");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-20 right-8 w-[420px] max-w-[calc(100vw-64px)] glass-card rounded-2xl p-8 border border-white/10 shadow-2xl space-y-4">
        <h3 className="text-xl font-bold text-white">Add Contact</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full bg-[#16161e] border border-white/10 rounded-lg py-3 px-4 text-sm text-on-surface" />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" className="w-full bg-[#16161e] border border-white/10 rounded-lg py-3 px-4 text-sm text-on-surface" />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="w-full bg-[#16161e] border border-white/10 rounded-lg py-3 px-4 text-sm text-on-surface min-h-24" />
        <div className="flex gap-3">
          <button className="flex-1 py-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white" onClick={onClose}>Cancel</button>
          <button
            className="flex-1 py-3 bg-primary-container rounded-lg text-xs font-bold text-white"
            disabled={loading || !name.trim()}
            onClick={async () => {
              setLoading(true);
              try {
                await onSubmit({ name: name.trim(), role: role.trim() || "Lead", notes: notes.trim() });
                setName("");
                setRole("Lead");
                setNotes("");
                onClose();
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Adding..." : "Add Contact"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ToolFormPanel = ({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { tool: string; message: string; severity: string; action: string }) => Promise<void>;
}) => {
  const [tool, setTool] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-20 right-8 w-[420px] max-w-[calc(100vw-64px)] glass-card rounded-2xl p-8 border border-white/10 shadow-2xl space-y-4">
        <h3 className="text-xl font-bold text-white">Add Tool Alert</h3>
        <input value={tool} onChange={(e) => setTool(e.target.value)} placeholder="Tool" className="w-full bg-[#16161e] border border-white/10 rounded-lg py-3 px-4 text-sm text-on-surface" />
        <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" className="w-full bg-[#16161e] border border-white/10 rounded-lg py-3 px-4 text-sm text-on-surface" />
        <input value={severity} onChange={(e) => setSeverity(e.target.value)} placeholder="Severity (high/medium/low)" className="w-full bg-[#16161e] border border-white/10 rounded-lg py-3 px-4 text-sm text-on-surface" />
        <textarea value={action} onChange={(e) => setAction(e.target.value)} placeholder="Action" className="w-full bg-[#16161e] border border-white/10 rounded-lg py-3 px-4 text-sm text-on-surface min-h-24" />
        <div className="flex gap-3">
          <button className="flex-1 py-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white" onClick={onClose}>Cancel</button>
          <button
            className="flex-1 py-3 bg-primary-container rounded-lg text-xs font-bold text-white"
            disabled={loading || !tool.trim()}
            onClick={async () => {
              setLoading(true);
              try {
                await onSubmit({
                  tool: tool.trim(),
                  message: message.trim() || "Added from Orbit Stack Monitor",
                  severity: severity.trim().toLowerCase() || "medium",
                  action: action.trim() || "Review and configure monitor",
                });
                setTool("");
                setMessage("");
                setSeverity("medium");
                setAction("");
                onClose();
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Adding..." : "Add Tool"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- View: Dashboard ---

const DashboardView = ({
  briefingText,
  briefingLoading,
  briefingError,
  briefingSubtitle,
  briefingFallbackItems,
  marketTitle,
  marketText,
  recentActivity,
  onExecuteRecommendation,
  executeLoading,
  executeMessage,
  searchQuery,
  contactsCount,
  overdueContactsCount,
  highAlertsCount,
  decisionsCount,
  timeBriefingItems,
}: {
  briefingText: string | null;
  briefingLoading: boolean;
  briefingError: boolean;
  briefingSubtitle: string;
  briefingFallbackItems: string[];
  marketTitle: string;
  marketText: string;
  recentActivity: Array<{ icon: any; title: string; desc: string; time: string }>;
  onExecuteRecommendation: () => void;
  executeLoading: boolean;
  executeMessage: string | null;
  searchQuery: string;
  contactsCount: number;
  overdueContactsCount: number;
  highAlertsCount: number;
  decisionsCount: number;
  timeBriefingItems: string[];
}) => {
  const [showAllActivity, setShowAllActivity] = useState(false);
  const briefingLines = useMemo(() => {
    const source = briefingText
      ? briefingText.split(/\r?\n/g).map((l) => l.trim()).filter(Boolean)
      : [];
    const base = source.length ? source : briefingFallbackItems;
    const fallback = [...timeBriefingItems, ...base];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return fallback;
    return fallback.filter((line) => line.toLowerCase().includes(q));
  }, [briefingText, briefingFallbackItems, searchQuery, timeBriefingItems]);

  const filteredActivity = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recentActivity;
    return recentActivity.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.desc.toLowerCase().includes(q) ||
        a.time.toLowerCase().includes(q)
    );
  }, [recentActivity, searchQuery]);
  const visibleActivity = showAllActivity ? filteredActivity : filteredActivity.slice(0, 4);
  const metricCards = useMemo(
    () => [
      {
        label: "Follow-ups",
        title: "Action Required",
        status: `${overdueContactsCount} OVERDUE`,
        icon: AlertTriangle,
        color: "text-error",
        bgColor: "bg-error-container/20",
      },
      {
        label: "Stack Monitor",
        title: "Critical Alerts",
        status: `${highAlertsCount} ALERT${highAlertsCount === 1 ? "" : "S"}`,
        icon: Zap,
        color: "text-yellow-400",
        bgColor: "bg-yellow-400/20",
      },
      {
        label: "Decisions",
        title: "Strategy Vault",
        status: `${decisionsCount} LOGGED`,
        icon: ShieldCheck,
        color: "text-tertiary",
        bgColor: "bg-tertiary-container/20",
      },
    ],
    [decisionsCount, highAlertsCount, overdueContactsCount]
  );

  return (
    <motion.div 
      key="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <section className="glass-card rounded-2xl p-8 border-l-4 border-l-primary-container relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 pointer-events-none">
          <Sparkles className="w-12 h-12 text-primary opacity-20 group-hover:opacity-40 transition-opacity rotate-12" />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white mb-2">AI Daily Briefing</h2>
          <p className="text-on-surface-variant text-lg mb-8 max-w-2xl">
            {briefingSubtitle}
            {briefingLoading && (
              <span className="block mt-3 text-xs font-bold uppercase tracking-widest text-primary">
                refreshing with AI...
              </span>
            )}
          </p>
          <ul className="space-y-4">
            {briefingLoading && !briefingText ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded bg-white/10 animate-pulse" />
                  <SkeletonLine w="w-5/6" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded bg-white/10 animate-pulse" />
                  <SkeletonLine w="w-4/6" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded bg-white/10 animate-pulse" />
                  <SkeletonLine w="w-3/6" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded bg-white/10 animate-pulse" />
                  <SkeletonLine w="w-5/6" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded bg-white/10 animate-pulse" />
                  <SkeletonLine w="w-2/6" />
                </div>
              </div>
            ) : (
              briefingLines.map((item, i) => (
                <li key={i} className="flex items-start gap-4 group/item">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-on-surface group-hover/item:text-white transition-colors">{item}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metricCards.map((card, i) => (
          <GlassCard key={i} className="glass-card-hover cursor-pointer border-white/5">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <span className="bg-white/5 text-[10px] font-bold text-slate-400 px-3 py-1 rounded-full uppercase tracking-widest">{card.status}</span>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{card.label}</p>
            <h3 className="text-white text-xl font-bold">{card.title}</h3>
            {card.label === "Follow-ups" && (
              <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">{contactsCount} total contacts tracked</p>
            )}
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 glass-card rounded-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-white">Recent Activity</h3>
            <button
              className="text-primary text-xs font-bold uppercase tracking-widest hover:underline cursor-pointer"
              onClick={() => setShowAllActivity((p) => !p)}
            >
              {showAllActivity ? "Show Less" : "View All"}
            </button>
          </div>
          <div className="space-y-8 relative">
            <div className="absolute left-[15px] top-4 bottom-4 w-px bg-white/5" />
            {visibleActivity.map((activity, i) => (
              <div key={i} className="flex gap-6 relative">
                <div className="w-8 h-8 rounded-full bg-surface-container border border-white/5 flex items-center justify-center shrink-0 z-10">
                  <activity.icon className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <p className="text-white">
                    <span className="font-bold">{activity.title}</span> {activity.desc}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 glass-card rounded-2xl overflow-hidden flex flex-col group">
          <div className="h-48 relative overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80" 
              alt="AI Insights"
              className="w-full h-full object-cover grayscale transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
            <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-primary/20 backdrop-blur-md border border-primary/30 px-3 py-1 rounded-full">
              <Sparkles className="w-4 h-4 text-primary fill-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Orbit Insight</span>
            </div>
          </div>
          <div className="p-8 flex-1">
            <h4 className="text-2xl font-bold text-white mb-4">{marketTitle}</h4>
            <p className="text-on-surface-variant mb-8 line-clamp-3">
              {marketText}
            </p>
            <button
              className="w-full py-4 bg-primary-container text-white font-bold rounded-xl ai-glow transition-transform active:scale-[0.98] hover:brightness-110 cursor-pointer"
              onClick={onExecuteRecommendation}
              disabled={executeLoading}
            >
              {executeLoading ? "Executing..." : "Execute Recommendation"}
            </button>
            {executeMessage && <p className="text-xs text-slate-500 mt-3">{executeMessage}</p>}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- View: Follow-ups ---

const FollowUpsView = ({
  contacts,
  onDraftEmail,
  onPreCall,
  draftById,
  preCallById,
  loadingDraftById,
  loadingPreCallById,
  errorDraftById,
  errorPreCallById,
  searchQuery,
  onSyncLinkedIn,
  linkedInSyncLoading,
  linkedInSyncMessage,
  onAddContact,
  onReviewAllDrafts,
  reviewDraftsLoading,
}: {
  contacts: Array<WithId<ContactDoc>>;
  onDraftEmail: (contact: WithId<ContactDoc>) => void;
  onPreCall: (contact: WithId<ContactDoc>) => void;
  draftById: Record<string, string | null | undefined>;
  preCallById: Record<string, string | null | undefined>;
  loadingDraftById: Record<string, boolean | undefined>;
  loadingPreCallById: Record<string, boolean | undefined>;
  errorDraftById: Record<string, boolean | undefined>;
  errorPreCallById: Record<string, boolean | undefined>;
  searchQuery: string;
  onSyncLinkedIn: () => void;
  linkedInSyncLoading: boolean;
  linkedInSyncMessage: string | null;
  onAddContact: () => void;
  onReviewAllDrafts: () => void;
  reviewDraftsLoading: boolean;
}) => {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Overdue' | 'Pending' | 'Done'>('All');

  const styledContacts = useMemo(() => {
    return contacts.map((c) => {
      const name = c.name ?? "Unknown";
      const initial = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "NA";

      const last = toDateMaybe(
        c.lastContact ?? c.lastContactedAt ?? c.lastContacted ?? c.lastInteractionAt ?? c.lastInteraction
      );
      const daysSince = typeof c.daysSince === "number"
        ? c.daysSince
        : last
          ? daysBetween(last, new Date())
          : 0;

      const statusNormalized = (c.status ?? "").toLowerCase();
      const urgent = statusNormalized === "overdue" || daysSince >= 7;
      const ok = statusNormalized === "recent" || daysSince <= 1;

      const status = urgent
        ? `${daysSince} Days Overdue`
        : ok
          ? "Up to date"
          : `Due in ${Math.max(1, 7 - daysSince)} days`;

      const desc = c.notes ? `"${c.notes}"` : '"No notes yet."';

      return {
        ...c,
        name,
        company: c.company ?? "",
        type: c.role ?? c.type ?? "Contact",
        initial,
        status,
        urgent,
        ok,
        desc,
        _daysSince: daysSince,
      };
    });
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return styledContacts.filter((c: any) => {
      const byFilter =
        activeFilter === 'All'
          ? true
          : activeFilter === 'Overdue'
            ? c.urgent
            : activeFilter === 'Done'
              ? c.ok
              : !c.urgent && !c.ok;
      if (!byFilter) return false;
      if (!q) return true;
      return (
        String(c.name ?? "").toLowerCase().includes(q) ||
        String(c.type ?? "").toLowerCase().includes(q) ||
        String(c.company ?? "").toLowerCase().includes(q) ||
        String(c.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [styledContacts, activeFilter, searchQuery]);

  const followUpVelocity = useMemo(() => {
    const all = styledContacts;
    if (!all.length) {
      return {
        bars: [30, 35, 28, 40, 33, 38, 36],
        insight:
          "Add more contacts to unlock data-driven follow-up velocity insights.",
      };
    }

    const overdue = all.filter((c: any) => c.urgent).length;
    const upToDate = all.filter((c: any) => c.ok).length;
    const pending = Math.max(0, all.length - overdue - upToDate);
    const avgDays =
      all.reduce((sum: number, c: any) => sum + Number(c._daysSince ?? 0), 0) /
      all.length;

    const score = Math.max(
      10,
      Math.min(
        100,
        Math.round((upToDate / all.length) * 100 - (overdue / all.length) * 40 + (7 - avgDays) * 4)
      )
    );

    const bars = [
      Math.max(18, score - 15),
      Math.max(22, score - 8),
      Math.max(20, score - 12),
      Math.max(28, score),
      Math.max(20, score - 10),
      Math.max(22, score - 6),
      Math.max(20, score - 9),
    ].map((v) => Math.min(95, Math.round(v)));

    return {
      bars,
      insight: `${upToDate} up-to-date, ${pending} pending, ${overdue} overdue. Avg follow-up lag is ${avgDays.toFixed(
        1
      )} days.`,
    };
  }, [styledContacts]);

  return (
    <motion.div 
      key="follow-ups"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-12"
    >
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Action Required</span>
          </div>
          <h2 className="text-4xl font-bold text-white">Follow-ups</h2>
          <p className="text-on-surface-variant mt-2 font-medium">AI-prioritized relationship management</p>
        </div>
        <button
          className="bg-primary-container hover:bg-[#6d28d9] text-white px-6 py-4 rounded-xl font-bold flex items-center gap-3 transition-all ai-glow active:scale-95 cursor-pointer"
          onClick={onAddContact}
        >
          <Plus className="w-5 h-5" />
          Add Contact
        </button>
      </div>

      <div className="flex items-center gap-3">
        {['All', 'Overdue', 'Pending', 'Done'].map((filter, i) => (
          <button 
            key={i}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
              activeFilter === filter ? 'bg-primary text-on-primary' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
            onClick={() => setActiveFilter(filter as 'All' | 'Overdue' | 'Pending' | 'Done')}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map((contact, i) => (
          <GlassCard key={i} className="flex flex-col group hover:border-primary/40 transition-all duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border ${
                contact.initial === 'JD' || contact.initial === 'EL' ? 'bg-error-container/20 text-error border-error/30' : 
                contact.ok ? 'bg-tertiary-container/20 text-tertiary border-tertiary/30' : 'bg-secondary-container/20 text-secondary border-secondary/30'
              }`}>
                {contact.initial}
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                contact.urgent ? 'bg-error-container text-on-error-container' : 'bg-white/5 text-slate-400'
              }`}>
                {contact.urgent ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {contact.status}
              </span>
            </div>

            <div>
              <h3 className="text-white font-bold text-xl">{contact.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-bold text-slate-400">{contact.type}</span>
                <span className="text-slate-500 text-sm">• {contact.company}</span>
              </div>
            </div>

            <div className="mt-6 mb-8 p-4 bg-white/[0.02] rounded-lg border border-white/5">
              <p className="text-sm text-slate-400 line-clamp-2 italic leading-relaxed">{contact.desc}</p>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-4">
              <button
                className="py-3 text-slate-300 font-bold text-xs bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => onPreCall(contact)}
              >
                View History
              </button>
              <button
                className="py-3 bg-primary-container/20 text-primary hover:bg-primary-container/30 font-bold text-xs border border-primary-container/30 rounded-lg transition-colors cursor-pointer"
                onClick={() => onDraftEmail(contact)}
              >
                Draft Email
              </button>
            </div>

            {(loadingDraftById[contact.id] || errorDraftById[contact.id] || draftById[contact.id]) && (
              <div className="mt-6 p-4 bg-white/[0.02] rounded-lg border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Draft Email</span>
                  {loadingDraftById[contact.id] && <LoadingSpinner label="Drafting" />}
                </div>
                {errorDraftById[contact.id] ? (
                  <AIErrorCard />
                ) : (
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {draftById[contact.id]}
                  </p>
                )}
              </div>
            )}

            {(loadingPreCallById[contact.id] || errorPreCallById[contact.id] || preCallById[contact.id]) && (
              <div className="mt-4 p-4 bg-white/[0.02] rounded-lg border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Pre-call Briefing</span>
                  {loadingPreCallById[contact.id] && <LoadingSpinner label="Generating" />}
                </div>
                {errorPreCallById[contact.id] ? (
                  <AIErrorCard />
                ) : (
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {preCallById[contact.id]}
                  </p>
                )}
              </div>
            )}
          </GlassCard>
        ))}

        <div className="glass-card rounded-xl border-dashed border-white/10 flex flex-col items-center justify-center text-center p-12 group cursor-pointer hover:border-primary/50 transition-colors">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <UserPlus className="w-6 h-6 text-slate-500 group-hover:text-primary" />
          </div>
          <p className="text-slate-400 font-medium">Have a new lead?</p>
          <button
            className="mt-2 text-primary font-bold hover:underline cursor-pointer"
            onClick={onSyncLinkedIn}
            disabled={linkedInSyncLoading}
          >
            {linkedInSyncLoading ? "Syncing..." : "Sync from LinkedIn"}
          </button>
          {linkedInSyncMessage && (
            <p className="text-xs text-slate-500 mt-2">{linkedInSyncMessage}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 pt-6">
        <GlassCard className="col-span-12 lg:col-span-8 relative overflow-hidden flex flex-col">
          <div className="absolute top-6 right-6 flex items-center gap-2 p-1.5 px-3 rounded-full bg-primary/10 border border-primary/20">
            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#7c3aed]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">AI Intelligence Pulse</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Follow-up Velocity</h3>
          <p className="text-slate-400 max-w-md mb-12">
            {followUpVelocity.insight}
          </p>
          
          <div className="flex items-end gap-3 h-32 mt-auto">
            {followUpVelocity.bars.map((h, i) => (
              <motion.div 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.1, duration: 1 }}
                className={`flex-1 rounded-t-lg transition-all ${i === 3 ? 'bg-primary-container ai-glow' : 'bg-white/5 hover:bg-primary/20'}`} 
              />
            ))}
          </div>
        </GlassCard>

        <div className="col-span-12 lg:col-span-4 glass-card rounded-2xl p-8 flex flex-col justify-between">
          <div>
            <Sparkles className="w-10 h-10 text-primary mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">Drafting Assistant</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Orbit has prepared 4 draft emails based on your last 24h of Slack and Email activity.
            </p>
          </div>
          <button
            className="w-full mt-12 py-4 bg-white text-[#0a0a0f] rounded-xl font-black uppercase tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl cursor-pointer"
            onClick={onReviewAllDrafts}
            disabled={reviewDraftsLoading}
          >
            {reviewDraftsLoading ? "Preparing..." : "Review All Drafts"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// --- View: Stack Monitor ---

const StackMonitorView = ({
  stackAlertsText,
  stackAlertsLoading,
  stackAlertsError,
  stackAlerts,
  onAddTool,
  onApplyPatch,
  onQuarantine,
  patching,
  quarantining,
  searchQuery,
  nowTick,
}: {
  stackAlertsText: string | null;
  stackAlertsLoading: boolean;
  stackAlertsError: boolean;
  stackAlerts: Array<WithId<StackAlertDoc>>;
  onAddTool: () => void;
  onApplyPatch: () => void;
  onQuarantine: () => void;
  patching: boolean;
  quarantining: boolean;
  searchQuery: string;
  nowTick: number;
}) => {
  const [eventFilter, setEventFilter] = useState<"all" | "unresolved">("unresolved");
  const eventFeed = useMemo(() => {
    const dayStamp = new Date().toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const mapped = stackAlerts.map((a) => ({
      tool: a.tool ?? "Stack Tool",
      message: a.message ?? "No event details available.",
      severity: (a.severity ?? "low").toLowerCase(),
      action: a.action ?? "No action needed",
      timeLabel: (a.severity ?? "").toLowerCase() === "high" ? `Today • ${dayStamp}` : `Active • ${dayStamp}`,
    }));
    const filteredByStatus =
      eventFilter === "unresolved"
        ? mapped.filter((a) => a.severity !== "low" && !a.action.toLowerCase().includes("no action"))
        : mapped;
    const q = searchQuery.trim().toLowerCase();
    const filteredByQuery = q
      ? filteredByStatus.filter(
          (a) =>
            a.tool.toLowerCase().includes(q) ||
            a.message.toLowerCase().includes(q) ||
            a.action.toLowerCase().includes(q) ||
            a.severity.toLowerCase().includes(q)
        )
      : filteredByStatus;
    return filteredByQuery.length ? filteredByQuery : filteredByStatus.length ? filteredByStatus : mapped;
  }, [stackAlerts, eventFilter, searchQuery, nowTick]);
  const onlineNodes = Math.max(1, stackAlerts.length * 3);
  const criticalNodes = stackAlerts.filter((a) => (a.severity ?? "").toLowerCase() === "high").length;
  const warningNodes = stackAlerts.filter((a) => (a.severity ?? "").toLowerCase() === "medium").length;
  const stableNodes = Math.max(0, onlineNodes - criticalNodes - warningNodes);
  const uptimePct = `${Math.max(96.5, 99.9 - criticalNodes * 0.2 - warningNodes * 0.08).toFixed(1)}%`;
  const latencyMs = `${Math.max(24, 28 + criticalNodes * 9 + warningNodes * 5)}ms`;
  const reqPerSec = `${Math.max(1.1, onlineNodes * 0.32).toFixed(1)}k`;
  const topFeed = eventFeed.slice(0, 4);
  const severityPill = (severity: string) => {
    if (severity === "high") return "px-3 py-1 bg-error-container text-on-error-container text-[10px] font-black uppercase tracking-widest rounded-full";
    if (severity === "medium") return "px-3 py-1 bg-yellow-400/20 text-yellow-400 text-[10px] font-black uppercase tracking-widest rounded-full";
    return "px-3 py-1 bg-tertiary-container/20 text-tertiary text-[10px] font-black uppercase tracking-widest rounded-full";
  };
  const severityLabel = (severity: string) => (severity === "high" ? "Critical Alert" : severity === "medium" ? "Performance Warning" : "Info");
  const severityBorder = (severity: string) => (severity === "high" ? "border-l-error" : severity === "medium" ? "border-l-yellow-400" : "border-l-tertiary");
  return (
    <motion.div 
      key="stack-monitor"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-white">Stack Monitor</h2>
          <p className="text-on-surface-variant font-medium mt-2">Real-time intelligence on your technological infrastructure.</p>
        </div>
        <button
          className="bg-primary-container text-white px-6 py-4 rounded-xl font-bold flex items-center gap-3 ai-glow active:scale-95 transition-all cursor-pointer"
          onClick={onAddTool}
        >
          <Plus className="w-5 h-5" />
          Add Tool
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "CRITICAL", val: String(criticalNodes).padStart(2, "0"), desc: "High-severity stack issues requiring immediate action.", status: "Urgent", icon: AlertOctagon, color: "text-error" },
          { label: "WARNINGS", val: String(warningNodes).padStart(2, "0"), desc: "Medium-severity issues that may impact performance.", status: "Pending", icon: AlertTriangle, color: "text-yellow-400" },
          { label: "STABLE", val: String(stableNodes).padStart(2, "0"), desc: "Nodes operating without active warnings.", status: "Stable", icon: ShieldCheck, color: "text-tertiary" }
        ].map((stat, i) => (
          <GlassCard key={i} className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
              <stat.icon size={96} />
            </div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">{stat.label}</p>
            <div className="flex items-baseline gap-4 mt-4">
              <span className="text-6xl font-black text-white">{stat.val}</span>
              <span className={`${stat.color} font-bold text-xs flex items-center gap-1 bg-white/5 py-1 px-3 rounded-full border border-white/5`}>
                <Circle className="w-2 h-2 fill-current" /> {stat.status}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-6 leading-relaxed">{stat.desc}</p>
          </GlassCard>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xl font-bold text-white">Recent Activity Feed</h3>
          <div className="flex gap-2">
            <button
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                eventFilter === "all"
                  ? "bg-primary/20 text-primary border border-primary/20"
                  : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
              }`}
              onClick={() => setEventFilter("all")}
            >
              All Events
            </button>
            <button
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                eventFilter === "unresolved"
                  ? "bg-primary/20 text-primary border border-primary/20"
                  : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
              }`}
              onClick={() => setEventFilter("unresolved")}
            >
              Unresolved
            </button>
          </div>
        </div>

        {topFeed.length === 0 && (
          <div className="glass-card rounded-2xl overflow-hidden border-l-4 border-l-tertiary p-6 flex gap-6">
            <div className="w-12 h-12 rounded-xl bg-surface-container border border-white/5 flex items-center justify-center shrink-0">
              <Database className="text-white w-6 h-6" />
            </div>
            <div className="flex-1 space-y-3">
              <h4 className="text-xl font-bold text-white">No stack events yet</h4>
              <p className="text-on-surface-variant leading-relaxed">Add tools or alerts to populate the live activity feed and recommendations.</p>
            </div>
          </div>
        )}
        {topFeed.map((alert, idx) => (
          <div
            key={`${alert.tool}-${idx}`}
            className={`glass-card rounded-2xl overflow-hidden border-l-4 ${severityBorder(alert.severity)} p-6 flex gap-6 ${idx > 0 ? "opacity-90 hover:opacity-100 transition-opacity" : ""}`}
          >
            <div className="w-12 h-12 rounded-xl bg-surface-container border border-white/5 flex items-center justify-center shrink-0">
              {idx === 0 ? <Cloud className="text-white w-6 h-6" /> : <Database className="text-white w-6 h-6" />}
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xl font-bold text-white">{alert.tool}</h4>
                <span className={severityPill(alert.severity)}>{severityLabel(alert.severity)}</span>
              </div>
              <p className="text-on-surface-variant leading-relaxed">{alert.message}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-6 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-2"><Clock size={12} /> {alert.timeLabel}</span>
                  <span className="flex items-center gap-2"><History size={12} /> Last sync: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {idx === 0 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500 cursor-pointer" />}
              </div>

              {idx === 0 && (
                <div className="mt-8 p-6 rounded-xl bg-primary/5 border border-primary/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">AI Insight</span>
                      <span className="text-white font-bold text-sm">Recommended Action</span>
                    </div>
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  </div>
                  {stackAlertsLoading ? (
                    <div className="space-y-3">
                      <SkeletonLine w="w-5/6" />
                      <SkeletonLine w="w-4/6" />
                    </div>
                  ) : stackAlertsError ? (
                    <AIErrorCard />
                  ) : (
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {stackAlertsText ?? `Recommended action: ${alert.action}`}
                    </p>
                  )}
                  <div className="flex gap-4">
                    <button
                      className="bg-primary-container hover:bg-[#6d28d9] text-white px-6 py-2 rounded-lg text-xs font-bold transition-all ai-glow cursor-pointer"
                      onClick={onApplyPatch}
                      disabled={patching}
                    >
                      {patching ? "Applying..." : "Apply Patch"}
                    </button>
                    <button
                      className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-6 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      onClick={onQuarantine}
                      disabled={quarantining}
                    >
                      {quarantining ? "Quarantining..." : "Quarantine"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl h-[400px] relative overflow-hidden p-8 flex flex-col justify-between">
         <img 
          src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80" 
          alt="Topology"
          className="absolute inset-0 w-full h-full object-cover opacity-[0.07]"
        />
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <p className="text-primary text-[10px] font-bold uppercase tracking-[0.3em] mb-2">Live Stack Topology</p>
            <h3 className="text-3xl font-bold text-white">Global Distribution Network</h3>
          </div>
          <div className="flex gap-3">
            <div className="bg-[#051424]/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-tertiary shadow-[0_0_8px_#89ceff]" />
              <span className="text-xs font-bold text-white">{onlineNodes} Nodes Online</span>
            </div>
            <div className="bg-[#051424]/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-error animate-ping" />
              <span className="text-xs font-bold text-white">{criticalNodes} Critical Node{criticalNodes === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto flex items-center gap-8 p-6 px-12 glass-card rounded-full shadow-2xl">
          {[
            { label: "Uptime", val: uptimePct },
            { label: "Latency", val: latencyMs },
            { label: "Req/Sec", val: reqPerSec }
          ].map((item, i) => (
            <React.Fragment key={i}>
              <div className="text-center">
                <p className="text-2xl font-black text-white">{item.val}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</p>
              </div>
              {i < 2 && <div className="h-8 w-px bg-white/10" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// --- View: Chat ---

const ChatView = ({
  contacts,
  stackAlerts,
  decisions,
  searchQuery,
  nowTick,
  prefetchedDeadlineWarningsById,
}: {
  contacts: Array<WithId<ContactDoc>>;
  stackAlerts: Array<WithId<StackAlertDoc>>;
  decisions: Array<WithId<DecisionDoc>>;
  searchQuery: string;
  nowTick: number;
  prefetchedDeadlineWarningsById: Record<string, string>;
}) => {
  const initialContextMessage = useMemo(() => {
    const overdue = contacts.filter((c) => (c.status ?? "").toLowerCase() === "overdue").length;
    const critical = stackAlerts.filter((a) => (a.severity ?? "").toLowerCase() === "high").length;
    const nextDecision = decisions[0];
    const nextText = nextDecision?.text ?? nextDecision?.title ?? nextDecision?.decision;
    const nextDueLabel = nextDecision ? decisionDueLabel(nextDecision) : null;
    const deadlinePart = nextText
      ? ` Next decision: ${nextText}${nextDueLabel ? ` (${nextDueLabel})` : ""}.`
      : "";
    const dayStamp = new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
    return `Live context for ${dayStamp}: ${contacts.length} contacts, ${overdue} overdue follow-ups, ${critical} critical stack alerts.${deadlinePart} Ask me where to focus first.`;
  }, [contacts, decisions, stackAlerts, nowTick]);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          role: "ai",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          content: initialContextMessage,
        },
      ];
    });
  }, [initialContextMessage]);

  const timeNow = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const deadlineItems = useMemo(() => {
    const now = new Date();
    return decisions
      .map((d) => {
        const due = decisionDueDate(d);
        if (!due) return null;
        const task = d.text ?? d.title ?? d.decision ?? "Deadline";
        const dueInMinutes = Math.round((due.getTime() - now.getTime()) / 60000);
        const dueLabel = decisionDueLabel(d, now) ?? "scheduled";
        const daysRemaining = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { id: d.id, task, daysRemaining, dueInMinutes, dueLabel, dueAtMs: due.getTime() };
      })
      .filter(Boolean)
      .sort((a, b) => a.dueAtMs - b.dueAtMs) as Array<{ id: string; task: string; daysRemaining: number; dueInMinutes: number; dueLabel: string; dueAtMs: number }>;
  }, [decisions, nowTick]);

  const [deadlineWarningsById, setDeadlineWarningsById] = useState<Record<string, string>>(prefetchedDeadlineWarningsById ?? {});
  const [deadlineWarningsLoadingById, setDeadlineWarningsLoadingById] = useState<Record<string, boolean>>({});
  const [deadlineWarningsErrorById, setDeadlineWarningsErrorById] = useState<Record<string, boolean>>({});
  const latestDecision = decisions[0];
  const latestStackAlert = stackAlerts[0];

  useEffect(() => {
    // Seed any prefetched warnings (preload layer).
    if (prefetchedDeadlineWarningsById && Object.keys(prefetchedDeadlineWarningsById).length) {
      setDeadlineWarningsById((p) => ({ ...prefetchedDeadlineWarningsById, ...p }));
    }
    // generate warnings for up to 2 soonest deadlines
    const soonest = deadlineItems.slice(0, 2);

    soonest.forEach((item) => {
      if (deadlineWarningsById[item.id] || deadlineWarningsLoadingById[item.id]) return;
      setDeadlineWarningsLoadingById((p) => ({ ...p, [item.id]: true }));
      setDeadlineWarningsErrorById((p) => ({ ...p, [item.id]: false }));
      withTimeout(getDeadlineWarning(item.task, Math.max(0, item.daysRemaining)))
        .then((txt) => setDeadlineWarningsById((p) => ({ ...p, [item.id]: txt })))
        .catch(() => setDeadlineWarningsErrorById((p) => ({ ...p, [item.id]: true })))
        .finally(() => setDeadlineWarningsLoadingById((p) => ({ ...p, [item.id]: false })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineItems]);

  useEffect(() => {
    // Safety net: never leave chat loading indefinitely.
    if (!chatLoading) return;
    const timer = setTimeout(() => {
      setChatLoading(false);
      setChatError(true);
    }, 25000);
    return () => clearTimeout(timer);
  }, [chatLoading]);

  const sendChat = async () => {
    const question = chatInput.trim();
    if (!question || chatLoading) return;
    setChatError(false);
    setChatLoading(true);
    setChatInput("");

    setMessages((prev) => [
      ...prev,
      { role: "user", time: timeNow(), content: question },
    ]);

    try {
      const founderData = buildFounderSnapshot(contacts, stackAlerts, decisions);
      const aiTime = timeNow();
      // Create an empty AI message first, then stream chunks into it (Groq only).
      setMessages((prev) => [...prev, { role: "ai", time: aiTime, content: "" }]);
      let assembled = "";
      const answer = await withTimeout(
        chatWithAIStream(question, founderData, (chunk) => {
          assembled += chunk;
          setMessages((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i]?.role === "ai" && next[i]?.time === aiTime) {
                next[i] = { ...next[i], content: assembled };
                break;
              }
            }
            return next;
          });
        })
      );
      // Ensure final answer is set (covers non-streaming fallback providers too).
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i]?.role === "ai" && next[i]?.time === aiTime) {
            next[i] = { ...next[i], content: answer };
            break;
          }
        }
        return next;
      });
    } catch {
      setChatError(true);
      setMessages((prev) => [
        ...prev,
        { role: "ai", time: timeNow(), content: "Orbit could not load AI response, please try again" },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => String(m.content ?? "").toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const clearThread = () => {
    setMessages([
      {
        role: "ai",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        content: "Thread cleared. Ask Orbit a new question anytime.",
      },
    ]);
    setExportStatus(null);
  };

  const exportSummary = async () => {
    const summary = messages
      .map((m) => `[${String(m.role).toUpperCase()} ${m.time}] ${m.content}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(summary);
      setExportStatus("Summary copied to clipboard.");
    } catch {
      setExportStatus("Could not copy summary. Try again.");
    }
  };

  return (
    <motion.div 
      key="chat"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-[calc(100vh-64px)] -m-8 overflow-hidden bg-surface"
    >
      {/* Context Panel */}
      <aside className="w-[30%] border-r border-white/5 p-8 overflow-y-auto space-y-8 glass-card border-none rounded-none shadow-none no-scrollbar">
        <h2 className="text-2xl font-bold text-white mb-8">Current Context</h2>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Active Follow-ups</span>
            <Bell className="w-3 h-3 text-primary" />
          </div>
          <div className="glass-card p-6 rounded-2xl border-white/5 space-y-4">
            {deadlineItems.slice(0, 2).map((d, idx) => (
              <div key={d.id} className="flex items-start gap-4">
                {idx === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                )}
                <div className="space-y-2">
                  <p className={`text-sm ${idx === 0 ? 'text-white' : 'text-slate-400'}`}>
                    {d.task} ({d.dueLabel})
                  </p>
                  {deadlineWarningsLoadingById[d.id] ? (
                    <div className="space-y-2">
                      <SkeletonLine w="w-5/6" />
                      <SkeletonLine w="w-3/6" />
                    </div>
                  ) : deadlineWarningsErrorById[d.id] ? (
                    <AIErrorCard />
                  ) : deadlineWarningsById[d.id] ? (
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {deadlineWarningsById[d.id]}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-error uppercase tracking-widest">Stack Alerts</span>
            <AlertOctagon className="w-3 h-3 text-error" />
          </div>
          <div className="glass-card p-6 rounded-2xl border-error/20 bg-error-container/5">
            <p className="text-sm font-bold text-error mb-2">{latestStackAlert?.tool ?? "No active alert"}</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {latestStackAlert?.message ?? "Add stack alerts in Firebase to see live context here."}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Last Decision</span>
            <TrendingUp className="w-3 h-3 text-tertiary" />
          </div>
          <div className="glass-card p-6 rounded-2xl border-white/5">
            <p className="text-sm text-white italic leading-relaxed">
              "{latestDecision?.text ?? latestDecision?.title ?? latestDecision?.decision ?? "No decisions logged yet."}"
            </p>
            <div className="mt-4 flex items-center gap-4">
              <span className="text-[10px] font-bold text-slate-500 tracking-tighter">
                {latestDecision?.date ? String(latestDecision.date).toUpperCase() : "JUST NOW"}
              </span>
              <div className="h-px flex-1 bg-white/5" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <section className="flex-1 flex flex-col relative chat-gradient shadow-2xl">
        <header className="h-16 px-8 flex items-center justify-between border-b border-white/5 bg-[#0a0a0f]/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary-container/20 border border-primary/20 flex items-center justify-center ai-glow">
              <Orbit className="text-primary w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Orbit Intelligence</h3>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Insight Agent</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 glass-card border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/10 transition-all cursor-pointer"
              onClick={clearThread}
            >
              Clear Thread
            </button>
            <button
              className="px-4 py-2 bg-primary-container rounded-lg text-xs font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              onClick={exportSummary}
            >
              Export Summary
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar">
          {filteredMessages.map((msg, i) => (
            <div key={i} className={`flex gap-6 max-w-2xl ${msg.role === 'user' ? 'ml-auto justify-end' : ''}`}>
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-primary-container border border-primary/30 flex items-center justify-center shrink-0 ai-glow">
                  <Orbit className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`p-6 rounded-2xl shadow-xl transition-all ${
                msg.role === 'ai' 
                  ? 'bg-surface-container-high border border-white/5 rounded-tl-none text-on-surface' 
                  : 'bg-primary-container text-white rounded-tr-none'
              }`}>
                <p className="text-sm leading-relaxed text-balance">{msg.content}</p>
                {msg.insight && (
                  <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-3 h-3 text-tertiary" />
                      <span className="text-[10px] font-black text-tertiary uppercase tracking-widest">Model Projection</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{msg.insight}</p>
                  </div>
                )}
                <span className={`text-[10px] mt-4 block font-bold tracking-widest ${msg.role === 'ai' ? 'text-slate-500' : 'text-white/50 text-right'}`}>
                  {msg.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 border-t border-white/5 bg-[#0a0a0f] backdrop-blur-md">
          <div className="max-w-4xl mx-auto glass-card flex items-center gap-4 p-2 pl-4 pr-3 rounded-2xl border-white/10 focus-within:ring-1 focus-within:ring-primary/40 transition-all">
            <button className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all cursor-pointer">
              <Paperclip size={20} />
            </button>
            <input 
              type="text" 
              placeholder="Ask anything about your stack, fundraising, or roadmap..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-slate-600 text-sm py-3"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendChat();
              }}
            />
            <button
              className="w-12 h-12 bg-primary-container rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              onClick={sendChat}
            >
              <Send size={18} className="text-white" />
            </button>
          </div>
          {chatLoading && (
            <div className="max-w-4xl mx-auto mt-4">
              <LoadingSpinner label="Orbit is thinking" />
            </div>
          )}
          {chatError && (
            <div className="max-w-4xl mx-auto mt-4">
              <AIErrorCard />
            </div>
          )}
          {exportStatus && <p className="text-center text-xs text-slate-500 mt-4">{exportStatus}</p>}
          <p className="text-center text-[9px] text-slate-600 mt-6 font-bold uppercase tracking-[0.3em]">Orbit can hallucinate. Verify critical financial data.</p>
        </div>
      </section>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contactPanelOpen, setContactPanelOpen] = useState(false);
  const [toolPanelOpen, setToolPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [linkedInSyncLoading, setLinkedInSyncLoading] = useState(false);
  const [linkedInSyncMessage, setLinkedInSyncMessage] = useState<string | null>(null);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [executeMessage, setExecuteMessage] = useState<string | null>(null);
  const [reviewDraftsLoading, setReviewDraftsLoading] = useState(false);
  const [patching, setPatching] = useState(false);
  const [quarantining, setQuarantining] = useState(false);

  const [contacts, setContacts] = useState<Array<WithId<ContactDoc>>>([]);
  const [stackAlerts, setStackAlerts] = useState<Array<WithId<StackAlertDoc>>>([]);
  const [decisions, setDecisions] = useState<Array<WithId<DecisionDoc>>>([]);

  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState(false);

  const [stackAlertsText, setStackAlertsText] = useState<string | null>(null);
  const [stackAlertsLoading, setStackAlertsLoading] = useState(false);
  const [stackAlertsError, setStackAlertsError] = useState(false);
  const [prefetchedDeadlineWarningsById, setPrefetchedDeadlineWarningsById] = useState<Record<string, string>>({});

  const [draftById, setDraftById] = useState<Record<string, string | null>>({});
  const [preCallById, setPreCallById] = useState<Record<string, string | null>>({});
  const [loadingDraftById, setLoadingDraftById] = useState<Record<string, boolean>>({});
  const [loadingPreCallById, setLoadingPreCallById] = useState<Record<string, boolean>>({});
  const [errorDraftById, setErrorDraftById] = useState<Record<string, boolean>>({});
  const [errorPreCallById, setErrorPreCallById] = useState<Record<string, boolean>>({});
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // App-start AI preloading (best-effort).
  // Runs once on mount, then waits until we have a signed-in user + base data.
  useEffect(() => {
    let cancelled = false;
    let didRun = false;

    const tick = async () => {
      if (cancelled || didRun) return;
      // Only preload once we have the data snapshot used as input.
      if (!user || !contacts.length || !decisions.length) {
        setTimeout(tick, 250);
        return;
      }
      didRun = true;

      // 1) Daily Briefing + Stack Alerts (cache layer in aiService.ts will short-circuit if present)
      try {
        const founderData = buildFounderSnapshot(contacts, stackAlerts, decisions);
        getDailyBriefing(founderData)
          .then((txt) => !cancelled && txt && setBriefingText(txt))
          .catch(() => undefined);
      } catch {
        // ignore
      }
      try {
        const stack = stackAlerts.map((it) => it.tool).filter(Boolean) as string[];
        const newsList = stackAlerts
          .map((it) => [it.tool, it.message, it.action, it.severity].filter(Boolean).join(" | "))
          .filter(Boolean) as string[];
        getStackAlerts(stack, newsList)
          .then((txt) => !cancelled && txt && setStackAlertsText(txt))
          .catch(() => undefined);
      } catch {
        // ignore
      }

      // 2) Deadline Warnings: prefetch for 2 soonest items (so Chat context feels instant)
      try {
        const now = new Date();
        const soonest = decisions
          .map((d) => {
            const due = decisionDueDate(d);
            if (!due) return null;
            const daysRemaining = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const task = d.text ?? d.title ?? d.decision ?? "Deadline";
            return { id: d.id, task, daysRemaining, dueAtMs: due.getTime() };
          })
          .filter(Boolean)
          .sort((a, b) => a.dueAtMs - b.dueAtMs)
          .slice(0, 2) as Array<{ id: string; task: string; daysRemaining: number }>;

        soonest.forEach((item) => {
          getDeadlineWarning(item.task, Math.max(0, item.daysRemaining))
            .then((txt) => {
              if (cancelled) return;
              setPrefetchedDeadlineWarningsById((p) => (p[item.id] ? p : { ...p, [item.id]: txt }));
            })
            .catch(() => undefined);
        });
      } catch {
        // ignore
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) return;
      try {
        const [c, s, d] = await Promise.all([
          fetchCollection<ContactDoc>("contacts"),
          fetchFirstAvailableCollection<StackAlertDoc>(["stackAlerts", "stackItems"]),
          fetchCollection<DecisionDoc>("decisions"),
        ]);
        if (cancelled) return;
        setContacts(c);
        setStackAlerts(s);
        setDecisions(d);

        setBriefingLoading(true);
        setBriefingError(false);
        try {
          const founderData = buildFounderSnapshot(c, s, d);
          const txt = await withTimeout(getDailyBriefing(founderData), 8000);
          if (!cancelled) setBriefingText(txt);
        } catch {
          // Keep fast data-driven fallback instead of blocking with an error card.
          if (!cancelled) setBriefingText(null);
        } finally {
          if (!cancelled) setBriefingLoading(false);
        }

        setStackAlertsLoading(true);
        setStackAlertsError(false);
        try {
          const stack = s
            .map((it) => it.tool)
            .filter(Boolean) as string[];
          const newsList = s
            .map((it) => [it.tool, it.message, it.action, it.severity].filter(Boolean).join(" | "))
            .filter(Boolean) as string[];
          const txt = await withTimeout(getStackAlerts(stack, newsList));
          if (!cancelled) setStackAlertsText(txt);
        } catch {
          if (!cancelled) setStackAlertsError(true);
        } finally {
          if (!cancelled) setStackAlertsLoading(false);
        }
      } catch {
        if (cancelled) return;
        setBriefingError(true);
        setStackAlertsError(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleDraftEmail = async (contact: WithId<ContactDoc>) => {
    if (loadingDraftById[contact.id]) return;
    setErrorDraftById((p) => ({ ...p, [contact.id]: false }));
    setLoadingDraftById((p) => ({ ...p, [contact.id]: true }));
    try {
      const last = toDateMaybe(
        contact.lastContact ?? contact.lastContactedAt ?? contact.lastContacted ?? contact.lastInteractionAt ?? contact.lastInteraction
      );
      const daysSince = typeof contact.daysSince === "number"
        ? contact.daysSince
        : last
          ? daysBetween(last, new Date())
          : 0;

      const txt = await withTimeout(draftFollowUp({
        name: contact.name ?? "Unknown",
        role: contact.role ?? contact.type ?? "Contact",
        notes: contact.notes ?? "",
        daysSince,
      }));
      setDraftById((p) => ({ ...p, [contact.id]: txt }));
    } catch {
      setErrorDraftById((p) => ({ ...p, [contact.id]: true }));
    } finally {
      setLoadingDraftById((p) => ({ ...p, [contact.id]: false }));
    }
  };

  const handlePreCall = async (contact: WithId<ContactDoc>) => {
    if (loadingPreCallById[contact.id]) return;
    setErrorPreCallById((p) => ({ ...p, [contact.id]: false }));
    setLoadingPreCallById((p) => ({ ...p, [contact.id]: true }));
    try {
      const last = toDateMaybe(
        contact.lastContact ?? contact.lastContactedAt ?? contact.lastContacted ?? contact.lastInteractionAt ?? contact.lastInteraction
      );
      const days = last ? daysBetween(last, new Date()) : 0;
      const txt = await withTimeout(getPreCallBriefing({
        name: contact.name ?? "Unknown",
        role: contact.role ?? contact.type ?? "Contact",
        notes: contact.notes ?? "",
        promises: contact.promises ?? "",
        days,
      }));
      setPreCallById((p) => ({ ...p, [contact.id]: txt }));
    } catch {
      setErrorPreCallById((p) => ({ ...p, [contact.id]: true }));
    } finally {
      setLoadingPreCallById((p) => ({ ...p, [contact.id]: false }));
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setSettingsOpen(false);
  };

  const handleSyncLinkedIn = async () => {
    setLinkedInSyncLoading(true);
    setLinkedInSyncMessage(null);
    try {
      // Placeholder sync: imports sample leads and keeps flow functional.
      // Replace this with LinkedIn OAuth API integration once credentials are available.
      const samples = [
        {
          name: "LinkedIn Lead 1",
          role: "Lead",
          notes: "Imported from LinkedIn sync",
          status: "pending",
          daysSince: 0,
          source: "linkedin",
        },
        {
          name: "LinkedIn Lead 2",
          role: "Lead",
          notes: "Imported from LinkedIn sync",
          status: "pending",
          daysSince: 0,
          source: "linkedin",
        },
      ];
      await Promise.all(samples.map((doc) => addDoc(collection(db, "contacts"), doc)));
      const refreshed = await fetchCollection<ContactDoc>("contacts");
      setContacts(refreshed);
      setLinkedInSyncMessage("LinkedIn contacts synced successfully.");
    } catch {
      setLinkedInSyncMessage("LinkedIn sync failed. Please try again.");
    } finally {
      setLinkedInSyncLoading(false);
    }
  };

  const handleAddContact = async () => {
    setContactPanelOpen(true);
  };

  const submitAddContact = async (payload: { name: string; role: string; notes: string }) => {
    try {
      await addDoc(collection(db, "contacts"), {
        name: payload.name,
        role: payload.role,
        notes: payload.notes,
        status: "pending",
        daysSince: 0,
        lastContact: new Date().toISOString().slice(0, 10),
      });
      setContacts(await fetchCollection<ContactDoc>("contacts"));
    } catch {
      // noop: keep UI stable
    }
  };

  const handleReviewAllDrafts = async () => {
    setReviewDraftsLoading(true);
    try {
      await Promise.all(contacts.map((c) => handleDraftEmail(c)));
    } finally {
      setReviewDraftsLoading(false);
    }
  };

  const handleExecuteRecommendation = async () => {
    setExecuteLoading(true);
    setExecuteMessage(null);
    try {
      await addDoc(collection(db, "decisions"), {
        text: "Executed Orbit recommendation from dashboard",
        date: new Date().toISOString().slice(0, 10),
        madeBy: user?.displayName ?? "Founder",
        tag: "automation",
      });
      setDecisions(await fetchCollection<DecisionDoc>("decisions"));
      setExecuteMessage("Recommendation executed and logged in Decisions.");
    } catch {
      setExecuteMessage("Could not execute recommendation right now.");
    } finally {
      setExecuteLoading(false);
    }
  };

  const handleAddTool = async () => {
    setToolPanelOpen(true);
  };

  const submitAddTool = async (payload: { tool: string; message: string; severity: string; action: string }) => {
    try {
      await addDoc(collection(db, "stackAlerts"), {
        tool: payload.tool,
        type: "manual_add",
        message: payload.message,
        severity: payload.severity,
        action: payload.action,
        date: new Date().toISOString().slice(0, 10),
      });
      setStackAlerts(await fetchFirstAvailableCollection<StackAlertDoc>(["stackAlerts", "stackItems"]));
    } catch {
      // noop
    }
  };

  const handleApplyPatch = async () => {
    setPatching(true);
    try {
      await addDoc(collection(db, "decisions"), {
        text: "Applied stack patch from Stack Monitor",
        date: new Date().toISOString().slice(0, 10),
        madeBy: user?.displayName ?? "Founder",
        tag: "stack",
      });
    } finally {
      setPatching(false);
    }
  };

  const handleQuarantine = async () => {
    setQuarantining(true);
    try {
      await addDoc(collection(db, "decisions"), {
        text: "Quarantined stack alert from Stack Monitor",
        date: new Date().toISOString().slice(0, 10),
        madeBy: user?.displayName ?? "Founder",
        tag: "security",
      });
    } finally {
      setQuarantining(false);
    }
  };

  const recentActivity = useMemo(() => {
    const todayStamp = new Date().toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const overdue = contacts.filter((c) => (c.status ?? "").toLowerCase() === "overdue").length;
    const topContact = contacts[0];
    const topAlert = stackAlerts[0];
    const topDecision = decisions[0];
    const nextDecisionText = topDecision?.text ?? topDecision?.title ?? topDecision?.decision;
    const nextDecisionDueLabel = topDecision ? decisionDueLabel(topDecision) : null;
    const urgentDecisions = decisions.filter((d) => {
      const days = decisionDaysRemaining(d);
      return typeof days === "number" && days <= 1;
    }).length;

    const items = [
      { icon: Mail, title: "Follow-ups refreshed", desc: `for ${contacts.length} contacts (${overdue} overdue as of ${todayStamp}).`, time: `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` },
      { icon: History, title: "Stack alerts synced", desc: `${stackAlerts.length} alerts in monitor, priorities adjusted for today.`, time: `Today ${todayStamp}` },
      { icon: UserPlus, title: "Decisions synced", desc: `${decisions.length} items in strategy vault (${urgentDecisions} urgent in next 24h).`, time: "Live" },
    ];
    if (topContact?.name) {
      items.push({ icon: UserPlus, title: "Latest contact update", desc: `${topContact.name} (${topContact.role ?? topContact.type ?? "Contact"}) added to pipeline.`, time: "Now" });
    }
    if (topAlert?.tool) {
      items.push({ icon: AlertTriangle, title: `${topAlert.tool} alert`, desc: `${topAlert.severity ?? "low"} severity issue detected.`, time: "Now" });
    }
    if (nextDecisionText) {
      const deadlineBadge = nextDecisionDueLabel ? `(${nextDecisionDueLabel})` : "(no due date)";
      items.push({ icon: TrendingUp, title: "Decision context updated", desc: `${nextDecisionText} ${deadlineBadge}`, time: todayStamp });
    }
    return items;
  }, [contacts, stackAlerts, decisions, nowTick]);
  const notifications = useMemo(() => {
    const now = new Date();
    const soonDecisions = decisions
      .map((d) => {
        const text = d.text ?? d.title ?? d.decision ?? "Decision update";
        const label = decisionDueLabel(d, now);
        const due = decisionDueDate(d);
        if (!label || !due) return null;
        return { title: "Decision deadline", desc: `${text} (${label})`, time: due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      })
      .filter(Boolean) as Array<{ title: string; desc: string; time: string }>;
    const highAlerts = stackAlerts
      .filter((a) => (a.severity ?? "").toLowerCase() === "high")
      .slice(0, 3)
      .map((a) => ({
        title: `${a.tool ?? "Stack"} critical`,
        desc: a.message ?? "Critical stack alert detected.",
        time: "Live",
      }));
    return [...soonDecisions.slice(0, 3), ...highAlerts].slice(0, 6);
  }, [decisions, stackAlerts, nowTick]);
  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (n) =>
          n.desc.toLowerCase().includes("overdue") ||
          n.desc.toLowerCase().includes("due in") ||
          n.title.toLowerCase().includes("critical")
      ).length,
    [notifications]
  );
  const briefingSubtitle = useMemo(() => {
    const today = new Date().toLocaleDateString([], {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    const overdue = contacts.filter((c) => (c.status ?? "").toLowerCase() === "overdue").length;
    const alerts = stackAlerts.filter((a) => (a.severity ?? "").toLowerCase() === "high").length;
    const urgentDecisions = decisions.filter((d) => {
      const days = decisionDaysRemaining(d);
      return typeof days === "number" && days <= 1;
    }).length;
    if (!contacts.length && !stackAlerts.length) {
      return "Good morning. Connect your data and Orbit will generate live founder briefings.";
    }
    return `Today is ${today}. You have ${overdue} overdue follow-ups, ${alerts} high-priority stack alerts, and ${urgentDecisions} near-term decision${urgentDecisions === 1 ? "" : "s"}.`;
  }, [contacts, stackAlerts, decisions, nowTick]);
  const briefingFallbackItems = useMemo(() => {
    const items: string[] = [];
    contacts.slice(0, 3).forEach((c) => {
      items.push(`- ${c.name ?? "Contact"} (${c.role ?? c.type ?? "Contact"}): ${c.notes ?? "No notes yet."}`);
    });
    stackAlerts.slice(0, 2).forEach((a) => {
      items.push(`- ${a.tool ?? "Tool"} alert (${a.severity ?? "low"}): ${a.message ?? "No message"}`);
    });
    if (!items.length) {
      return [
        "Add contacts and stack alerts to generate live briefing points.",
        "Use Add Contact and Add Tool to feed Orbit with operating context.",
      ];
    }
    return items;
  }, [contacts, stackAlerts]);
  const timeBriefingItems = useMemo(() => {
    const now = new Date();
    const soonest = decisions
      .map((d) => {
        const text = d.text ?? d.title ?? d.decision ?? "Decision";
        const label = decisionDueLabel(d, now);
        const due = decisionDueDate(d);
        if (!label || !due) return null;
        return { text, label, ts: due.getTime() };
      })
      .filter(Boolean) as Array<{ text: string; label: string; ts: number }>;
    soonest.sort((a, b) => a.ts - b.ts);

    const alertsHigh = stackAlerts.filter((a) => (a.severity ?? "").toLowerCase() === "high").length;
    const stamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const items = [`Time check ${stamp}: ${alertsHigh} critical alert${alertsHigh === 1 ? "" : "s"} active right now.`];
    if (soonest[0]) items.push(`Nearest decision: ${soonest[0].text} (${soonest[0].label}).`);
    if (soonest[1]) items.push(`Next after that: ${soonest[1].text} (${soonest[1].label}).`);
    return items;
  }, [decisions, stackAlerts, nowTick]);

  const marketCard = useMemo(() => {
    const overdue = contacts.filter((c) => (c.status ?? "").toLowerCase() === "overdue").length;
    const high = stackAlerts.filter((a) => (a.severity ?? "").toLowerCase() === "high");
    const medium = stackAlerts.filter((a) => (a.severity ?? "").toLowerCase() === "medium");
    const topAlert = high[0] ?? medium[0] ?? stackAlerts[0];

    const deadlines = decisions
      .map((d) => {
        const due = toDateMaybe(d.deadline ?? d.dueDate ?? d.dueAt);
        const days =
          typeof d.daysRemaining === "number"
            ? d.daysRemaining
            : due
              ? Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;
        if (days === null) return null;
        return { text: d.text ?? d.title ?? d.decision ?? "Deadline", days };
      })
      .filter(Boolean) as Array<{ text: string; days: number }>;
    deadlines.sort((a, b) => a.days - b.days);
    const nextDeadline = deadlines[0];

    if (topAlert) {
      const sev = (topAlert.severity ?? "low").toLowerCase();
      const title =
        sev === "high"
          ? "High-Impact Shift Detected"
          : sev === "medium"
            ? "Material Update Detected"
            : "Signal Update";
      const deadlineLine = nextDeadline ? ` Next deadline: ${nextDeadline.text} (${nextDeadline.days} days).` : "";
      const followUpLine = overdue ? ` You have ${overdue} overdue follow-ups to unblock.` : " Your follow-ups are on track.";
      return {
        title,
        text: `${topAlert.tool ?? "Stack"}: ${topAlert.message ?? "Update detected."} Recommended action: ${topAlert.action ?? "Review and respond."}.${followUpLine}${deadlineLine}`,
      };
    }

    const title = overdue ? "Momentum Risk Detected" : "Momentum Stable";
    const deadlineLine = nextDeadline ? ` Next deadline: ${nextDeadline.text} (${nextDeadline.days} days).` : "";
    const text = overdue
      ? `You have ${overdue} overdue follow-ups. Clear the top 1–2 today to keep pipeline velocity steady.${deadlineLine}`
      : `No critical stack alerts detected. Keep cadence steady and log decisions as you execute.${deadlineLine}`;
    return { title, text };
  }, [contacts, stackAlerts, decisions, nowTick]);

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return (
        <DashboardView
          briefingText={briefingText}
          briefingLoading={briefingLoading}
          briefingError={briefingError}
          briefingSubtitle={briefingSubtitle}
          briefingFallbackItems={briefingFallbackItems}
          marketTitle={marketCard.title}
          marketText={marketCard.text}
          recentActivity={recentActivity}
          onExecuteRecommendation={handleExecuteRecommendation}
          executeLoading={executeLoading}
          executeMessage={executeMessage}
          searchQuery={searchQuery}
          contactsCount={contacts.length}
          overdueContactsCount={contacts.filter((c) => (c.status ?? "").toLowerCase() === "overdue").length}
          highAlertsCount={stackAlerts.filter((a) => (a.severity ?? "").toLowerCase() === "high").length}
          decisionsCount={decisions.length}
          timeBriefingItems={timeBriefingItems}
        />
      );
      case 'follow-ups': return (
        <FollowUpsView
          contacts={contacts}
          onDraftEmail={handleDraftEmail}
          onPreCall={handlePreCall}
          draftById={draftById}
          preCallById={preCallById}
          loadingDraftById={loadingDraftById}
          loadingPreCallById={loadingPreCallById}
          errorDraftById={errorDraftById}
          errorPreCallById={errorPreCallById}
          searchQuery={searchQuery}
          onSyncLinkedIn={handleSyncLinkedIn}
          linkedInSyncLoading={linkedInSyncLoading}
          linkedInSyncMessage={linkedInSyncMessage}
          onAddContact={handleAddContact}
          onReviewAllDrafts={handleReviewAllDrafts}
          reviewDraftsLoading={reviewDraftsLoading}
        />
      );
      case 'stack-monitor': return (
        <StackMonitorView
          stackAlertsText={stackAlertsText}
          stackAlertsLoading={stackAlertsLoading}
          stackAlertsError={stackAlertsError}
          stackAlerts={stackAlerts}
          onAddTool={handleAddTool}
          onApplyPatch={handleApplyPatch}
          onQuarantine={handleQuarantine}
          patching={patching}
          quarantining={quarantining}
          searchQuery={searchQuery}
          nowTick={nowTick}
        />
      );
      case 'chat': return (
        <ChatView
          contacts={contacts}
          stackAlerts={stackAlerts}
          decisions={decisions}
          searchQuery={searchQuery}
          nowTick={nowTick}
          prefetchedDeadlineWarningsById={prefetchedDeadlineWarningsById}
        />
      );
      default: return (
        <DashboardView
          briefingText={briefingText}
          briefingLoading={briefingLoading}
          briefingError={briefingError}
          briefingSubtitle={briefingSubtitle}
          briefingFallbackItems={briefingFallbackItems}
          marketTitle={marketCard.title}
          marketText={marketCard.text}
          recentActivity={recentActivity}
          onExecuteRecommendation={handleExecuteRecommendation}
          executeLoading={executeLoading}
          executeMessage={executeMessage}
          searchQuery={searchQuery}
          contactsCount={contacts.length}
          overdueContactsCount={contacts.filter((c) => (c.status ?? "").toLowerCase() === "overdue").length}
          highAlertsCount={stackAlerts.filter((a) => (a.severity ?? "").toLowerCase() === "high").length}
          decisionsCount={decisions.length}
          timeBriefingItems={timeBriefingItems}
        />
      );
    }
  };

  return (
    authLoading ? (
      <div className="min-h-screen bg-surface selection:bg-[#7c3aed]/30 scroll-smooth no-scrollbar flex items-center justify-center p-8">
        <div className="glass-card rounded-2xl p-8 border-white/5">
          <LoadingSpinner label="Initializing Orbit" />
        </div>
        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    ) : !user ? (
      <AuthView />
    ) : (
    <div className="min-h-screen bg-surface selection:bg-[#7c3aed]/30 scroll-smooth no-scrollbar">
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} user={user} />
      <div className="ml-64 min-h-screen flex flex-col">
        <TopBar
          onOpenSettings={() => setSettingsOpen(true)}
          user={user}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          notifications={notifications}
          unreadCount={unreadCount}
        />
        <main className={`p-8 mt-16 flex-1 ${currentTab === 'chat' ? 'overflow-hidden' : ''}`}>
          <div className={`${currentTab === 'chat' ? 'h-full' : 'max-w-7xl mx-auto'}`}>
            <AnimatePresence mode="wait">
              {renderContent()}
            </AnimatePresence>
          </div>
        </main>
      </div>
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        onSignOut={handleSignOut}
      />
      <ContactFormPanel
        open={contactPanelOpen}
        onClose={() => setContactPanelOpen(false)}
        onSubmit={submitAddContact}
      />
      <ToolFormPanel
        open={toolPanelOpen}
        onClose={() => setToolPanelOpen(false)}
        onSubmit={submitAddTool}
      />
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
    )
  );
}
