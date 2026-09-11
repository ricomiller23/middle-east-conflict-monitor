'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  ArrowLeft,
  Key,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  AlertTriangle,
  Server,
  FileText,
  ListFilter,
  ExternalLink,
} from 'lucide-react';
import { IngestionLog, SystemSettings } from '@/lib/types';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [sources, setSources] = useState<any>(null);

  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  const authenticate = async (pwdToTest = password) => {
    setLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/status', {
        headers: { Authorization: `Bearer ${pwdToTest}` },
      });

      if (res.status === 401) {
        setAuthError('Invalid Admin Password. Check ADMIN_PASSWORD environment variable.');
        setIsAuthenticated(false);
      } else {
        const data = await res.json();
        if (data.success) {
          setIsAuthenticated(true);
          setSettings(data.settings);
          setLogs(data.logs || []);
          setSources(data.sources);
          sessionStorage.setItem('me_admin_token', pwdToTest);
        }
      }
    } catch (err: any) {
      setAuthError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('me_admin_token');
    if (saved) {
      setPassword(saved);
      authenticate(saved);
    } else {
      // Attempt auth without password in case ADMIN_PASSWORD is unset in local dev
      authenticate('');
    }
  }, []);

  const toggleDigest = async () => {
    if (!settings) return;
    const newPaused = !settings.digest_paused;
    try {
      const res = await fetch('/api/digest/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: newPaused }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => (prev ? { ...prev, digest_paused: newPaused } : null));
      }
    } catch (err) {
      console.error('Failed to toggle digest:', err);
    }
  };

  const handleTriggerIngest = async () => {
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await fetch('/api/admin/trigger', {
        method: 'POST',
        headers: { Authorization: `Bearer ${password}` },
      });
      const data = await res.json();
      if (data.success) {
        setTriggerMsg(
          `Ingestion complete: ${data.totalFetched} fetched, ${data.totalIngested} ingested, ${data.newEventsCount} new incidents.`
        );
        // Refresh logs
        authenticate(password);
      } else {
        setTriggerMsg(`Ingestion failed: ${data.error}`);
      }
    } catch (e: any) {
      setTriggerMsg(`Error: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-[#0a0f1d] px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-cyan-400" />
              <h1 className="font-mono text-sm font-bold tracking-wider text-slate-100">
                SYSTEM OPS & CONNECTOR CONSOLE
              </h1>
            </div>
          </div>

          <div className="font-mono text-xs text-slate-400">
            {isAuthenticated ? (
              <span className="flex items-center space-x-1 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Authorized</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-amber-400">
                <Key className="h-3.5 w-3.5" />
                <span>Authentication Required</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* Auth Barrier if password protected */}
        {!isAuthenticated ? (
          <div className="mx-auto max-w-md rounded-xl border border-slate-800 bg-[#0d1424] p-8 shadow-2xl mt-12 text-center">
            <Key className="mx-auto h-10 w-10 text-cyan-400 mb-3" />
            <h2 className="text-lg font-bold text-slate-100 mb-2">Admin Security Gate</h2>
            <p className="text-xs text-slate-400 mb-6">
              Enter your configured <code className="text-cyan-400">ADMIN_PASSWORD</code> to view connector logs and adjust pipeline settings.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                authenticate(password);
              }}
              className="space-y-4 text-left"
            >
              <div>
                <label className="block font-mono text-xs text-slate-400 mb-1">
                  Access Key / Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full rounded-md border border-slate-700 bg-[#080d1a] px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {authError && (
                <div className="rounded bg-rose-950/50 p-2.5 text-xs text-rose-400 border border-rose-500/30">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-cyan-600 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Unlock Ops Console'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Operational Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Ingestion Trigger */}
              <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-5">
                <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-bold uppercase mb-2">
                  <Play className="h-4 w-4" />
                  <span>Manual Ingestion Run</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Trigger an immediate cycle across all RSS feeds, GDELT API, and citation extractors.
                </p>
                <button
                  onClick={handleTriggerIngest}
                  disabled={triggering}
                  className="w-full flex items-center justify-center space-x-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${triggering ? 'animate-spin' : ''}`} />
                  <span>{triggering ? 'Executing Pipeline...' : 'Run Ingestion Cycle Now'}</span>
                </button>
                {triggerMsg && (
                  <p className="mt-2 text-[11px] font-mono text-emerald-400">{triggerMsg}</p>
                )}
              </div>

              {/* Email Digest Controls */}
              <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-5">
                <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-bold uppercase mb-2">
                  <Mail className="h-4 w-4" />
                  <span>Email Digest Automation</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-300">Digest Status:</span>
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
                      settings?.digest_paused
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-500/40'
                        : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {settings?.digest_paused ? 'PAUSED' : 'ACTIVE (4x/DAY)'}
                  </span>
                </div>
                <button
                  onClick={toggleDigest}
                  className={`w-full flex items-center justify-center space-x-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    settings?.digest_paused
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-rose-600/80 hover:bg-rose-600 text-white'
                  }`}
                >
                  {settings?.digest_paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  <span>{settings?.digest_paused ? 'Resume Email Digests' : 'Pause Email Digests'}</span>
                </button>
                <div className="mt-2 text-[11px] text-slate-500 font-mono">
                  Last Sent: {settings?.last_digest_sent_at ? new Date(settings.last_digest_sent_at).toLocaleString() : 'Pending next cycle'}
                </div>
              </div>

              {/* Vercel Cron Status */}
              <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-5">
                <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-bold uppercase mb-2">
                  <Clock className="h-4 w-4" />
                  <span>Vercel Cron Schedule</span>
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Schedule:</span>
                    <span className="text-slate-200">0 */6 * * * (Every 6h)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Path:</span>
                    <span className="text-slate-200">/api/cron/ingest</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Auth Gate:</span>
                    <span className="text-emerald-400">Bearer CRON_SECRET</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion Logs Table */}
            <div className="rounded-xl border border-slate-800 bg-[#0d1424] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 bg-[#0f172a] px-5 py-3">
                <div className="flex items-center space-x-2">
                  <Server className="h-4 w-4 text-cyan-400" />
                  <h2 className="font-mono text-xs font-bold text-slate-200">
                    CONNECTOR EXECUTION & INGESTION LOGS (RECENT RUNS)
                  </h2>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  {logs.length} Logged Entries
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-slate-800 bg-[#0a0f1d] text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5">Timestamp</th>
                      <th className="px-4 py-2.5">Connector</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Fetched</th>
                      <th className="px-4 py-2.5">Duration</th>
                      <th className="px-4 py-2.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {logs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-2 text-slate-400 whitespace-nowrap">
                          {new Date(l.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-2 font-medium text-slate-200">{l.connector_name}</td>
                        <td className="px-4 py-2">
                          {l.status === 'success' ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>OK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-rose-400">
                              <XCircle className="h-3 w-3" />
                              <span>ERR</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-400">{l.events_fetched} items</td>
                        <td className="px-4 py-2 text-slate-400">{l.duration_ms}ms</td>
                        <td className="px-4 py-2 text-slate-500 truncate max-w-xs">
                          {l.error_message || 'Completed cleanly'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Configured Source Allowlist Section */}
            <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ListFilter className="h-4 w-4 text-cyan-400" />
                  <h3 className="font-mono text-xs font-bold text-slate-200">
                    VERIFIED SOURCE ALLOWLIST (config/sources.json)
                  </h3>
                </div>
                <span className="text-xs text-slate-400">Strict Anti-Misinformation Guardrails</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sources?.social_allowlist?.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-800 bg-[#080d1a] p-3 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{item.name}</span>
                      <span className="rounded bg-emerald-950/60 px-1.5 py-0.2 font-mono text-[10px] text-emerald-400 border border-emerald-500/30">
                        {item.credibility_tier.toUpperCase()}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-cyan-400">@{item.handle}</div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
