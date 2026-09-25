import React, { useState, useEffect } from 'react';
import { getSupportTickets, addSupportTicket, deleteSupportTicket, getUserProfile, getStoredData } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { getTranslation } from '../lib/i18n';

const DOCS_DATA = {
  api: {
    title: 'API Reference',
    icon: 'api',
    subtitle: 'REST & GraphQL API Endpoints for PolyCollab Integration',
    content: `
Authentication
All API requests require a Bearer token in the HTTP Authorization header:
\`\`\`http
Authorization: Bearer poly_live_9f83ac1209b...
\`\`\`

Key Endpoints
- **GET /v1/projects**: List all public projects.
- **POST /v1/projects**: Create a new project repository.
- **GET /v1/builders**: Search registered builder profiles.
- **POST /v1/sprints/join**: Register participation in an active build sprint.

Response Format
All JSON responses follow the standard PolyCollab schema:
\`\`\`json
{
  "status": "success",
  "data": {
    "id": "proj_8921",
    "title": "Nexus OS Dashboard",
    "active_sprints": 2
  }
}
\`\`\`
`
  },
  webhooks: {
    title: 'Webhooks Guide',
    icon: 'webhook',
    subtitle: 'Real-time Event Notifications for Repositories & Build Sprints',
    content: `
Setting Up Webhooks
1. Navigate to **Settings > Developer Webhooks**.
2. Click **Add Endpoint** and enter your listener URL.
3. Select events: \`project.created\`, \`sprint.completed\`, \`application.received\`.

Webhook Signature Verification
Verify payload authenticity using the \`X-PolyCollab-Signature\` HMAC SHA-256 header:
\`\`\`javascript
const crypto = require('crypto');
const hmac = crypto.createHmac('sha256', secretKey)
                  .update(rawBody)
                  .digest('hex');
\`\`\`
`
  },
  cli: {
    title: 'CLI Setup & Usage',
    icon: 'terminal',
    subtitle: 'Command-Line Tools for Local Sprint Deployment & Automation',
    content: `
Installation
Install the PolyCollab CLI globally via npm or Homebrew:
\`\`\`bash
npm install -g @polycollab/cli
\`\`\`

Common Commands
- \`polycollab login\` Authenticate local environment with your workspace.
- \`polycollab sprint start --id=sprint-92\` Launch local ephemeral staging environment.
- \`polycollab deploy --target=staging\` Deploy commits directly to sprint preview builds.
- \`polycollab status\` Inspect active builds, RPC logs, and connected services.
`
  },
  getting_started: {
    title: 'Getting Started Guide',
    icon: 'rocket_launch',
    subtitle: 'Welcome to PolyCollab Workspace Setup',
    content: `
1. Complete Your Profile
Set up your technical bio, primary skills, and preferred contact handle in Settings so project leads can discover you.

2. Explore Projects & Build Sprints
Browse open-source projects under Explore Projects or participate in time-boxed hackathons under Build Sprints.

3. Submit Applications & Collaborate
Apply directly to open project roles, submit code PRs, and earn reputation badges upon sprint completion.
`
  },
  project_mgmt: {
    title: 'Project Management',
    icon: 'account_tree',
    subtitle: 'Managing Resources, Repositories, and Environments',
    content: `
Workspace Organization
Organize project repositories by environment (Development, Staging, Production). Assign granular access roles (Admin, Developer, Viewer) to team members.

Deployment Pipelines
Automate continuous deployment through GitHub Action webhooks or PolyCollab native CLI preview deployments.
`
  },
  collaboration: {
    title: 'Collaboration Tools',
    icon: 'groups',
    subtitle: 'Team Communication & Real-time Workspaces',
    content: `
In-App Messaging
Communicate directly with builders, project leads, and sprint organizers via direct messages.

Build Sprint Rooms
Track live code commits, task boards, and staging URLs directly from the active sprint dashboard.
`
  }
};

export default function HelpSupport() {
  const [language, setLanguage] = useState(() => {
    const acc = getStoredData('account', {});
    return acc.language || 'English (US)';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDocKey, setActiveDocKey] = useState(null);

  useEffect(() => {
    const handleStorageChange = () => {
      const acc = getStoredData('account', {});
      setLanguage(acc.language || 'English (US)');
    };
    window.addEventListener('polycollab_state_change', handleStorageChange);
    return () => window.removeEventListener('polycollab_state_change', handleStorageChange);
  }, []);
  
  const currentUser = getUserProfile();
  const currentUserEmail = currentUser.primaryEmail;

  // Ticket Modal & List States
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketsList, setTicketsList] = useState(() => getSupportTickets(currentUserEmail));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(null);

  // Form State for Ticket Submission
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'Technical Support',
    priority: 'Medium',
    description: '',
    attachmentName: ''
  });

  const selectedDoc = activeDocKey ? DOCS_DATA[activeDocKey] : null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTicketForm((prev) => ({ ...prev, attachmentName: file.name }));
    }
  };

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      return;
    }

    setIsSubmitting(true);

    setTimeout(async () => {
      let realEmail = currentUserEmail;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) realEmail = user.email;
      } catch (err) {}

      // Send real email alert by hitting backend
      try {
        await fetch('http://localhost:5000/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: ticketForm.subject,
            category: ticketForm.category,
            priority: ticketForm.priority,
            description: ticketForm.description,
            attachmentName: ticketForm.attachmentName,
            userEmail: realEmail,
            userName: currentUser.fullName || 'Builder'
          })
        });
      } catch (err) {
        console.error('Error submitting support ticket to backend:', err);
      }

      const created = addSupportTicket({
        subject: ticketForm.subject,
        category: ticketForm.category,
        priority: ticketForm.priority,
        description: ticketForm.description,
        attachmentName: ticketForm.attachmentName,
        userEmail: realEmail
      });

      setTicketsList(getSupportTickets(realEmail));
      setIsSubmitting(false);
      setSubmittedSuccess(created);

      // Reset Form
      setTicketForm({
        subject: '',
        category: 'Technical Support',
        priority: 'Medium',
        description: '',
        attachmentName: ''
      });
    }, 400);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-xl pb-xl relative">
      {/* Documentation Reader Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setActiveDocKey(null)}
              className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="flex items-center gap-3 border-b border-outline-variant/60 pb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">{selectedDoc.icon}</span>
              </div>
              <div>
                <h3 className="font-headline-md text-xl font-bold text-on-surface">{selectedDoc.title}</h3>
                <p className="text-xs font-mono text-on-surface-variant">{selectedDoc.subtitle}</p>
              </div>
            </div>

            <div className="prose dark:prose-invert max-w-none text-on-surface-variant font-body-md text-sm leading-relaxed whitespace-pre-line">
              {selectedDoc.content}
            </div>

            <div className="pt-4 border-t border-outline-variant/60 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveDocKey(null)}
                className="px-5 py-2 bg-primary text-on-primary rounded-lg font-mono text-xs font-semibold cursor-pointer hover:bg-surface-tint transition-colors"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL TICKET SUBMISSION MODAL */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-outline-variant rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[22px]">confirmation_number</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-lg font-bold text-on-surface">Submit Support Ticket</h3>
                  <p className="text-xs text-on-surface-variant">
                    Logged in as <span className="font-semibold text-primary">{currentUser.fullName || 'User'}</span> ({currentUser.primaryEmail || 'No Email'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTicketModalOpen(false);
                  setSubmittedSuccess(null);
                }}
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Success View */}
            {submittedSuccess ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[36px]">check_circle</span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-headline-md text-xl font-bold text-on-surface">Ticket Created Successfully!</h4>
                  <p className="text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
                    Hi <span className="font-semibold text-primary">{currentUser.fullName || 'Alex'}</span>, we have received your ticket (<span className="font-mono font-bold text-primary">#{submittedSuccess.id}: {submittedSuccess.subject}</span>). Our support team is reviewing your details and we will resolve your problem within 12–24 hours.
                  </p>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Subject:</span>
                    <span className="font-semibold text-on-surface">{submittedSuccess.subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Category:</span>
                    <span className="font-semibold text-on-surface">{submittedSuccess.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Priority:</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold">{submittedSuccess.priority}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSubmittedSuccess(null)}
                    className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg font-medium text-xs hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    Submit Another Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTicketModalOpen(false);
                      setSubmittedSuccess(null);
                    }}
                    className="px-5 py-2 bg-primary text-on-primary rounded-lg font-medium text-xs hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    View Active Tickets
                  </button>
                </div>
              </div>
            ) : (
              /* Ticket Input Form */
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-on-surface">Ticket Subject *</label>
                  <input
                    type="text"
                    required
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                    placeholder="e.g. Issue deploying build sprint preview build"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface">Category</label>
                    <div className="relative">
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 pr-8 text-sm focus:border-primary outline-none appearance-none cursor-pointer"
                      >
                        <option value="Technical Support">Technical Support</option>
                        <option value="Billing & Plans">Billing & Plans</option>
                        <option value="Account & Profile">Account & Profile</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="General Inquiry">General Inquiry</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface">Priority Level</label>
                    <div className="relative">
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 pr-8 text-sm focus:border-primary outline-none appearance-none cursor-pointer"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-on-surface">Detailed Description *</label>
                  <textarea
                    required
                    rows={4}
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                    placeholder="Provide full details, error logs, or steps to reproduce the issue..."
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-on-surface">Attach Log / Screenshot (Optional)</label>
                  <div className="flex items-center gap-3 bg-surface-container-lowest border border-dashed border-outline-variant rounded-lg p-3">
                    <span className="material-symbols-outlined text-secondary">attach_file</span>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="text-xs text-on-surface-variant file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsTicketModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !ticketForm.subject.trim() || !ticketForm.description.trim()}
                    className="px-6 py-2 bg-primary text-on-primary rounded-lg font-semibold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Ticket
                        <span className="material-symbols-outlined text-[16px]">send</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="text-center py-xl space-y-lg relative rounded-2xl bg-gradient-to-b from-surface to-background border border-outline-variant/30 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiM2MzY2ZjEiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />
        <div className="relative z-10 space-y-md max-w-2xl mx-auto px-lg">
          <h2 className="font-display-lg text-display-lg text-on-surface">
            {getTranslation(language, 'helpHeroTitle')}
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            {getTranslation(language, 'helpHeroSub')}
          </p>
        </div>
      </section>

      {/* Quick Start Grid */}
      <section className="space-y-md">
        <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2 font-semibold">
          <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
          {getTranslation(language, 'quickStartGuides')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {/* Card 1 */}
          <button
            type="button"
            onClick={() => setActiveDocKey('getting_started')}
            className="group text-left block bg-surface-container-lowest border border-outline-variant rounded-xl p-lg hover:border-primary/50 transition-all hover:bg-surface-container-low/50 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-inverse-on-surface text-primary flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[24px]">rocket_launch</span>
            </div>
            <h4 className="font-title-md text-title-md text-on-surface mb-xs font-semibold">{getTranslation(language, 'gettingStartedTitle')}</h4>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {getTranslation(language, 'gettingStartedDesc')}
            </p>
          </button>
          {/* Card 2 */}
          <button
            type="button"
            onClick={() => setActiveDocKey('project_mgmt')}
            className="group text-left block bg-surface-container-lowest border border-outline-variant rounded-xl p-lg hover:border-primary/50 transition-all hover:bg-surface-container-low/50 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-inverse-on-surface text-primary flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[24px]">account_tree</span>
            </div>
            <h4 className="font-title-md text-title-md text-on-surface mb-xs font-semibold">{getTranslation(language, 'projectMgmtTitle')}</h4>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {getTranslation(language, 'projectMgmtDesc')}
            </p>
          </button>
          {/* Card 3 */}
          <button
            type="button"
            onClick={() => setActiveDocKey('collaboration')}
            className="group text-left block bg-surface-container-lowest border border-outline-variant rounded-xl p-lg hover:border-primary/50 transition-all hover:bg-surface-container-low/50 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-inverse-on-surface text-primary flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[24px]">groups</span>
            </div>
            <h4 className="font-title-md text-title-md text-on-surface mb-xs font-semibold">{getTranslation(language, 'collabToolsTitle')}</h4>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {getTranslation(language, 'collabToolsDesc')}
            </p>
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        {/* Developer Documentation List */}
        <section className="lg:col-span-1 space-y-md">
          <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-primary text-[20px]">library_books</span>
            {getTranslation(language, 'devDocsTitle')}
          </h3>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <ul className="divide-y divide-outline-variant">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveDocKey('api')}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">api</span>
                    </div>
                    <span className="font-medium text-on-surface">{getTranslation(language, 'apiRef')}</span>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant group-hover:text-primary group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveDocKey('webhooks')}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">webhook</span>
                    </div>
                    <span className="font-medium text-on-surface">{getTranslation(language, 'webhooksGuide')}</span>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant group-hover:text-primary group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveDocKey('cli')}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">terminal</span>
                    </div>
                    <span className="font-medium text-on-surface">{getTranslation(language, 'cliSetup')}</span>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant group-hover:text-primary group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </button>
              </li>
            </ul>

          </div>
        </section>

        {/* Popular FAQs Accordion */}
        <section className="lg:col-span-2 space-y-md">
          <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-primary text-[20px]">forum</span>
            {getTranslation(language, 'popularFaqs')}
          </h3>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant shadow-sm">
            {/* Accordion Item 1 */}
            <details className="group" open>
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-5 text-on-surface hover:text-primary transition-colors">
                <span>{getTranslation(language, 'faq1Q')}</span>
                <span className="transition group-open:rotate-180">
                  <span className="material-symbols-outlined text-[20px]">expand_more</span>
                </span>
              </summary>
              <div className="text-on-surface-variant text-sm px-5 pb-5 leading-relaxed">
                {getTranslation(language, 'faq1A')}
              </div>
            </details>

            {/* Accordion Item 2 */}
            <details className="group">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-5 text-on-surface hover:text-primary transition-colors">
                <span>{getTranslation(language, 'faq2Q')}</span>
                <span className="transition group-open:rotate-180">
                  <span className="material-symbols-outlined text-[20px]">expand_more</span>
                </span>
              </summary>
              <div className="text-on-surface-variant text-sm px-5 pb-5 leading-relaxed">
                {getTranslation(language, 'faq2A')}
              </div>
            </details>

            {/* Accordion Item 3 */}
            <details className="group">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-5 text-on-surface hover:text-primary transition-colors">
                <span>{getTranslation(language, 'faq3Q')}</span>
                <span className="transition group-open:rotate-180">
                  <span className="material-symbols-outlined text-[20px]">expand_more</span>
                </span>
              </summary>
              <div className="text-on-surface-variant text-sm px-5 pb-5 leading-relaxed">
                {getTranslation(language, 'faq3A')}
              </div>
            </details>
          </div>
        </section>
      </div>

      {/* MY RECENT TICKETS SECTION */}
      {ticketsList.length > 0 && (
        <section className="space-y-md pt-lg border-t border-outline-variant/60">
          <div className="flex items-center justify-between">
            <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2 font-semibold">
              <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
              Your Submitted Tickets ({ticketsList.length})
            </h3>
            <button
              type="button"
              onClick={() => setIsTicketModalOpen(true)}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              New Ticket
            </button>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl divide-y divide-outline-variant/60 overflow-hidden shadow-sm">
            {ticketsList.map((ticket) => (
              <div key={ticket.id} className="p-4 hover:bg-surface-container-low/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 group">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{ticket.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-medium">
                      {ticket.category}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      ticket.status === 'Open' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-on-surface">{ticket.subject}</h4>
                  <p className="text-xs text-on-surface-variant line-clamp-1">{ticket.description}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                  <div className="text-right">
                    <span className="text-[11px] text-on-surface-variant block">{ticket.createdAt}</span>
                    {ticket.attachmentName && (
                      <span className="text-[11px] text-primary flex items-center gap-1 justify-end mt-0.5">
                        <span className="material-symbols-outlined text-[12px]">attach_file</span>
                        {ticket.attachmentName}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      deleteSupportTicket(ticket.id);
                      setTicketsList(getSupportTickets(currentUserEmail));
                    }}
                    title="Delete Ticket"
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Support Ticket CTA Banner */}
      <section className="mt-xl">
        <div className="bg-primary-container/10 border border-primary/20 rounded-2xl p-lg md:p-xl flex flex-col md:flex-row items-center justify-between gap-lg relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-md text-center md:text-left">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[28px]">support_agent</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-xs font-bold">Still need help?</h3>
              <p className="text-on-surface-variant max-w-md">
                Our support team is available 24/7 to assist you with technical issues or billing inquiries.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsTicketModalOpen(true)}
            className="relative z-10 shrink-0 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
          >
            Submit a Ticket
            <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
          </button>
        </div>
      </section>
    </div>
  );
}
