import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserProfile } from '../lib/storage';

export default function IncomingApplications() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApplications = async () => {
      const currentUser = getUserProfile();
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/applications/lead/${currentUser.id}`
        );
        if (!res.ok) throw new Error('Failed to fetch applications');
        const json = await res.json();
        if (json.success) {
          setApps(json.data || []);
        } else {
          throw new Error(json.error);
        }
      } catch (err) {
        console.error('Error fetching incoming applications:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleAction = async (id, newStatus) => {
    // Optimistic update
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));

    // In a full implementation, you would send a PATCH request here:
    // await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
  };

return (
  <div className="max-w-container-max mx-auto space-y-lg">
    <div>
      <h1 className="font-headline-lg text-headline-lg text-on-surface">Project Applications</h1>
      <p className="font-body-lg text-body-lg text-on-surface-variant">Review applications from developers wanting to join your projects.</p>
    </div>

    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant">
      {loading && <div className="p-lg text-center text-on-surface-variant animate-pulse">Loading applications...</div>}
      {!loading && apps.length === 0 && (
        <div className="p-lg text-center text-on-surface-variant">No applications received yet.</div>
      )}
      {!loading && apps.map((app) => (
        <div key={app.id} className="p-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
          <div className="space-y-xs">
            <button
              onClick={() => navigate('/builder-profile', { state: { builder: { id: app.applicant_id, email: app.applicant?.primary_email } } })}
              className="flex items-center gap-sm cursor-pointer hover:opacity-80 transition-opacity text-left"
            >
              <img src={app.applicant?.avatar_url || 'https://ui-avatars.com/api/?name=Anonymous&background=6366f1&color=fff&size=128'} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-outline-variant" />
              <h3 className="font-title-md text-title-md text-on-surface hover:underline">{app.applicant?.full_name || 'Anonymous Applicant'}</h3>
              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-mono ml-2 no-underline">{app.role_applied}</span>
            </button>
            <p className="text-sm text-on-surface-variant mt-2">Applied for <span className="font-medium text-on-surface">{app.project_title}</span> • {new Date(app.created_at || app.applied_at).toLocaleDateString()}</p>
            <div className="text-body-md text-on-surface mt-sm bg-surface-container-low p-sm rounded border border-outline-variant/30 whitespace-pre-wrap">
              {app.why_join ? (
                <div className="space-y-2">
                  <p><strong>Pitch:</strong> {app.why_join}</p>
                  {app.experience && <p><strong>Experience:</strong> {app.experience}</p>}
                  {app.links && app.links.length > 0 && <p><strong>Links:</strong> {app.links.join(', ')}</p>}
                  {app.comm_pref && <p><strong>Contact via:</strong> {app.comm_pref} ({app.comm_handle})</p>}
                </div>
              ) : (
                'No additional pitch provided.'
              )}
            </div>
          </div>

          <div className="flex items-center gap-sm self-end md:self-center">
            {app.status === 'Pending' ? (
              <>
                <button
                  onClick={() => handleAction(app.id, 'Declined')}
                  className="px-md py-xs border border-outline-variant text-on-surface-variant hover:text-error rounded-lg text-sm cursor-pointer"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAction(app.id, 'Accepted')}
                  className="px-md py-xs bg-primary text-on-primary rounded-lg text-sm cursor-pointer"
                >
                  Accept
                </button>
              </>
            ) : (
              <span className={`px-md py-xs rounded-full font-label-md text-label-md ${(app.status || 'Pending') === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                  (app.status === 'Declined' ? 'bg-red-100 text-red-700' : 'bg-surface-variant text-on-surface-variant')
                }`}>
                {app.status || 'Pending'}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);
}
