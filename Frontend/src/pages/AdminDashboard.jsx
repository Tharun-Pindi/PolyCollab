import React, { useState, useEffect } from 'react';
import { getUserProfile } from '../lib/storage';

const ADMIN_EMAIL = 'pinditarun6@gmail.com';

export default function AdminDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'Open' | 'Resolved'
  const [expandedTicket, setExpandedTicket] = useState(null);

  const currentUser = getUserProfile();
  const isAdmin = currentUser?.primaryEmail === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/admin/tickets`);
      const json = await res.json();
      if (json.success) {
        setTickets(json.data || []);
      } else {
        throw new Error(json.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleResolve = async (ticketId) => {
    setResolvingId(ticketId);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_API_URL}/api/tickets/${ticketId}/resolve`,
        { method: 'PATCH' }
      );
      const json = await res.json();
      if (json.success) {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'Resolved' } : t));
        showToast(`Ticket ${ticketId} resolved! User has been notified by email.`, 'success');
      } else {
        showToast(json.error || 'Failed to resolve ticket.', 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-container-max mx-auto">
        <div className="bg-surface-container-lowest border border-red-300 rounded-xl p-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-red-500 text-[32px]">shield</span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Access Denied</h2>
          <p className="text-on-surface-variant">This page is restricted to PolyCollab administrators only.</p>
        </div>
      </div>
    );
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;

  const priorityColor = (p) => {
    if (p === 'Urgent') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (p === 'High') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    if (p === 'Medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  };

  return (
    <div className="max-w-container-max mx-auto space-y-lg relative">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold animate-in slide-in-from-top-2 fade-in ${
          toastMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {toastMsg.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toastMsg.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">Admin Dashboard</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Manage and resolve support tickets</p>
            </div>
          </div>
        </div>
        <button
          onClick={fetchTickets}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-md">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md text-center">
          <p className="text-2xl font-bold text-on-surface">{tickets.length}</p>
          <p className="text-xs text-on-surface-variant font-medium mt-1">Total Tickets</p>
        </div>
        <div className="bg-surface-container-lowest border border-blue-200 dark:border-blue-800 rounded-xl p-md text-center">
          <p className="text-2xl font-bold text-blue-600">{openCount}</p>
          <p className="text-xs text-on-surface-variant font-medium mt-1">Open</p>
        </div>
        <div className="bg-surface-container-lowest border border-emerald-200 dark:border-emerald-800 rounded-xl p-md text-center">
          <p className="text-2xl font-bold text-emerald-600">{resolvedCount}</p>
          <p className="text-xs text-on-surface-variant font-medium mt-1">Resolved</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant pb-1">
        {[
          { key: 'all', label: `All (${tickets.length})` },
          { key: 'Open', label: `Open (${openCount})` },
          { key: 'Resolved', label: `Resolved (${resolvedCount})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors cursor-pointer ${
              filter === tab.key
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden divide-y divide-outline-variant">
        {loading && (
          <div className="p-lg text-center text-on-surface-variant animate-pulse flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
            Loading tickets...
          </div>
        )}

        {!loading && error && (
          <div className="p-lg text-center text-red-500">
            <p>Error: {error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="p-xl text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-on-surface-variant text-[32px]">inbox</span>
            </div>
            <p className="text-on-surface-variant font-medium">
              {filter === 'all' ? 'No tickets yet.' : `No ${filter.toLowerCase()} tickets.`}
            </p>
          </div>
        )}

        {!loading && !error && filtered.map((ticket) => {
          const isOpen = ticket.status === 'Open';
          const isExpanded = expandedTicket === ticket.id;
          const isResolving = resolvingId === ticket.id;

          return (
            <div key={ticket.id} className="hover:bg-surface-container-low/30 transition-colors">
              {/* Ticket Row */}
              <div
                className="p-md flex flex-col md:flex-row md:items-center justify-between gap-md cursor-pointer"
                onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${isOpen ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-primary">{ticket.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${priorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-medium">
                        {ticket.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        isOpen ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-on-surface truncate">{ticket.subject}</h4>
                    <p className="text-xs text-on-surface-variant">
                      {ticket.user_name || 'User'} ({ticket.user_email}) • {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-sm shrink-0">
                  {isOpen && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleResolve(ticket.id); }}
                      disabled={isResolving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                    >
                      {isResolving ? (
                        <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      )}
                      {isResolving ? 'Resolving...' : 'Mark Resolved'}
                    </button>
                  )}
                  <span className={`material-symbols-outlined text-on-surface-variant text-[18px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-md pb-md ml-5 space-y-3 border-t border-outline-variant/40 pt-3">
                  <div className="bg-surface-container-low rounded-lg p-md text-sm text-on-surface-variant whitespace-pre-wrap">
                    <p className="font-semibold text-on-surface mb-1">Description:</p>
                    {ticket.description || 'No description provided.'}
                  </div>
                  {(ticket.attachment_url || ticket.attachment_name) && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-primary text-[16px]">attach_file</span>
                      <span className="text-on-surface-variant">{ticket.attachment_name || 'Attachment'}</span>
                      {ticket.attachment_url && (
                        <a
                          href={ticket.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline text-xs font-semibold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Image
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
