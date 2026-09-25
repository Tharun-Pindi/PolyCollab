import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getUserDrafts,
  saveUserDrafts,
  getUserCreatedProjects,
  addUserCreatedProject,
  saveUserCreatedProjects,
  deleteUserCreatedProject,
  fetchProjectsFromSupabase,
  getStoredData
} from '../lib/storage';
import { getTranslation } from '../lib/i18n';

const joinedProjects = [];

export default function MyProjects() {
  const navigate = useNavigate();
  const location = useLocation();

  // Parse tab parameter from URL query string (e.g. /my-projects?tab=drafts)
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');

  const [language, setLanguage] = useState(() => {
    const acc = getStoredData('account', {});
    return acc.language || 'English (US)';
  });
  const [activeTab, setActiveTab] = useState(tabParam || 'created');
  const [drafts, setDrafts] = useState(() => getUserDrafts());
  const [createdList, setCreatedList] = useState(() => getUserCreatedProjects());
  const [toastMsg, setToastMsg] = useState(null);

  // Sync state if external changes occur or route tabParam changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    fetchProjectsFromSupabase().then(() => {
      setCreatedList(getUserCreatedProjects());
    });

    const handleStateChange = () => {
      const acc = getStoredData('account', {});
      setLanguage(acc.language || 'English (US)');
      setDrafts(getUserDrafts());
      setCreatedList(getUserCreatedProjects());
    };
    window.addEventListener('polycollab_state_change', handleStateChange);
    return () => window.removeEventListener('polycollab_state_change', handleStateChange);
  }, []);

  // Draft Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [draftForm, setDraftForm] = useState({
    title: '',
    category: 'Web Application',
    desc: '',
    level: 'Intermediate',
    builders: '1-3 Builders'
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenEditDraft = (draft) => {
    setEditingDraft(draft);
    setDraftForm({
      title: draft.title || '',
      category: draft.category || 'Web Application',
      desc: draft.desc || '',
      level: draft.level || 'Intermediate',
      builders: draft.builders || '1-3 Builders'
    });
    setIsModalOpen(true);
  };

  // Publish Draft to Created Projects
  const handlePublishDraft = async () => {
    if (!draftForm.title.trim()) return;

    const newProject = {
      id: editingDraft ? editingDraft.id : `proj-${Date.now()}`,
      category: draftForm.category,
      title: draftForm.title,
      status: 'Open',
      statusType: 'open',
      level: draftForm.level,
      teamSize: draftForm.builders,
      team: `Team: ${draftForm.builders}`,
      desc: draftForm.desc,
      builders: `1/${draftForm.builders}`,
      tech: ['React', 'Node.js']
    };

    // Remove from drafts
    if (editingDraft) {
      const updatedDrafts = drafts.filter((d) => d.id !== editingDraft.id);
      setDrafts(updatedDrafts);
      saveUserDrafts(updatedDrafts);
    }

    // Add to created list via backend sync
    const updatedCreated = await addUserCreatedProject(newProject);
    setCreatedList(updatedCreated);

    setIsModalOpen(false);
    setActiveTab('created');
    showToast(`Project "${draftForm.title}" published successfully!`);
  };

  // Delete Draft
  const handleDeleteDraft = (draftId) => {
    const updatedDrafts = drafts.filter((d) => d.id !== draftId);
    setDrafts(updatedDrafts);
    saveUserDrafts(updatedDrafts);
    setIsModalOpen(false);
    showToast('Draft deleted.');
  };

  return (
    <div className="max-w-container-max mx-auto w-full space-y-xl relative">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#4648d4] text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-2 font-mono text-sm">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Edit Draft Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4">
              <h2 className="font-title-md text-xl font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_note</span>
                Edit Draft
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handlePublishDraft(); }} className="space-y-4">
              <div>
                <label className="block text-label-md text-on-surface-variant font-medium mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Code Reviewer"
                  value={draftForm.title}
                  onChange={(e) => setDraftForm({ ...draftForm, title: e.target.value })}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-md focus:border-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-md text-on-surface-variant font-medium mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend / AI"
                    value={draftForm.category}
                    onChange={(e) => setDraftForm({ ...draftForm, category: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-md focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-label-md text-on-surface-variant font-medium mb-1">
                    Level
                  </label>
                  <div className="relative">
                    <select
                      value={draftForm.level}
                      onChange={(e) => setDraftForm({ ...draftForm, level: e.target.value })}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 pr-10 text-on-surface font-body-md focus:border-primary outline-none cursor-pointer appearance-none"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-label-md text-on-surface-variant font-medium mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline your project idea..."
                  value={draftForm.desc}
                  onChange={(e) => setDraftForm({ ...draftForm, desc: e.target.value })}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-md focus:border-primary outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
                {editingDraft ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteDraft(editingDraft.id)}
                    className="text-error text-xs font-mono font-medium hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Delete Draft
                  </button>
                ) : (
                  <div></div>
                )}

                {/* ONLY Publish Project button inside Edit Draft (Save Draft removed as requested) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-outline-variant rounded-lg text-on-surface bg-surface-container-lowest hover:bg-surface-container transition-colors font-body-md text-sm font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePublishDraft}
                    className="px-5 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors font-body-md text-sm font-semibold shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">publish</span>
                    Publish Project
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header & Stats Overview */}
      <div className="space-y-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">{getTranslation(language, 'myProjects')}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              {getTranslation(language, 'myProjectsSub')}
            </p>
          </div>
          <button
            onClick={() => navigate('/applications')}
            className="px-5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-lg font-body-md font-semibold flex items-center gap-2 w-fit cursor-pointer border border-primary/20"
          >
            <span className="material-symbols-outlined text-[18px]">inbox</span>
            View Incoming Applications
          </button>
        </div>

        {/* Top 4 Stats Containers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
            <div className="text-on-surface-variant font-label-md text-label-md mb-2 flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px]">folder</span> {getTranslation(language, 'totalProjects')}
            </div>
            <div className="font-headline-md text-headline-md text-on-surface font-bold">
              {createdList.length + joinedProjects.length}
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md relative overflow-hidden">
            <div className="absolute right-0 top-0 w-16 h-16 bg-primary/5 rounded-bl-full"></div>
            <div className="text-primary font-label-md text-label-md mb-2 flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px]">play_circle</span> {getTranslation(language, 'activeProjects')}
            </div>
            <div className="font-headline-md text-headline-md text-on-surface font-bold">
              {createdList.filter((p) => p.status !== 'Completed').length + joinedProjects.filter((p) => p.status !== 'Completed').length}
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
            <div className="text-on-surface-variant font-label-md text-label-md mb-2 flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px]">task_alt</span> {getTranslation(language, 'completedProjects')}
            </div>
            <div className="font-headline-md text-headline-md text-on-surface font-bold">
              {createdList.filter((p) => p.status === 'Completed').length + joinedProjects.filter((p) => p.status === 'Completed').length}
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
            <div className="text-on-surface-variant font-label-md text-label-md mb-2 flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px]">drafts</span> {getTranslation(language, 'drafts')}
            </div>
            <div className="font-headline-md text-headline-md text-on-surface font-bold">
              {drafts.length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-outline-variant flex gap-lg overflow-x-auto">
        <button
          onClick={() => setActiveTab('created')}
          className={`pb-3 font-body-md text-body-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'created'
              ? 'text-primary font-bold border-b-2 border-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {getTranslation(language, 'createdByMe')} ({createdList.length})
        </button>
        <button
          onClick={() => setActiveTab('joined')}
          className={`pb-3 font-body-md text-body-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'joined'
              ? 'text-primary font-bold border-b-2 border-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {getTranslation(language, 'joinedByMe')} ({joinedProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('drafts')}
          className={`pb-3 font-body-md text-body-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'drafts'
              ? 'text-primary font-bold border-b-2 border-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {getTranslation(language, 'drafts')} ({drafts.length})
        </button>
      </div>

      {/* Projects Grid for Drafts */}
      {activeTab === 'drafts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {drafts.length > 0 ? (
            drafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col justify-between h-full hover:border-primary/50 transition-colors shadow-sm group"
              >
                <div>
                  {/* Category & Status Header */}
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-label-md text-[11px] text-primary tracking-wider uppercase font-semibold">
                      {draft.category}
                    </span>
                    <span className="px-2 py-0.5 border border-outline-variant rounded text-[11px] font-mono text-on-surface-variant bg-surface-container-low">
                      Draft
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-title-md text-title-md text-on-surface mb-2 group-hover:text-primary transition-colors">
                    {draft.title}
                  </h3>

                  {/* Description */}
                  <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3 mb-md leading-relaxed">
                    {draft.desc}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-md">
                    <span className="px-2.5 py-1 bg-surface-container rounded-full text-[12px] font-label-md text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">signal_cellular_alt</span>
                      {draft.level}
                    </span>
                    <span className="px-2.5 py-1 bg-surface-container rounded-full text-[12px] font-label-md text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">group</span>
                      {draft.builders}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-md border-t border-outline-variant/60 flex items-center justify-between mt-auto">
                  <span className="text-[12px] font-label-md text-on-surface-variant">
                    {draft.updated}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenEditDraft(draft)}
                    className="text-primary font-title-md text-[14px] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Edit Draft
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 text-outline">drafts</span>
              <p className="font-body-lg font-medium">No drafts found.</p>
              <p className="text-sm mt-1">Create a new project and click "Save Draft" to save drafts here.</p>
            </div>
          )}
        </div>
      )}

      {/* Projects Grid for Joined by Me */}
      {activeTab === 'joined' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {joinedProjects.length > 0 ? (
            joinedProjects.map((p) => (
              <div
                key={p.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md hover:border-primary/50 transition-colors flex flex-col h-full group"
              >
                <div className="flex justify-between items-start mb-md">
                  <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary font-bold text-lg border border-primary/10">
                    {p.initials}
                  </div>
                  <div className="flex flex-col items-end gap-xs">
                    <span
                      className={`px-2 py-1 rounded font-label-md text-label-md flex items-center gap-xs ${
                        p.statusType === 'progress'
                          ? 'border border-primary/30 text-primary bg-primary/5'
                          : p.statusType === 'completed'
                          ? 'border border-outline-variant text-on-surface-variant bg-surface-container-highest/30'
                          : 'border border-[#10B981]/30 text-[#10B981] bg-[#10B981]/5'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          p.statusType === 'progress'
                            ? 'bg-primary'
                            : p.statusType === 'completed'
                            ? 'bg-outline-variant'
                            : 'bg-[#10B981]'
                        }`}
                      ></span>
                      {p.status}
                    </span>
                    <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded text-[10px] font-medium">
                      {p.category}
                    </span>
                  </div>
                </div>

                <h3 className="font-title-md text-title-md text-on-surface mb-1 group-hover:text-primary transition-colors">
                  {p.title}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-md flex-1 leading-relaxed">
                  {p.desc}
                </p>

                <div className="space-y-sm mb-lg">
                  <div className="grid grid-cols-2 gap-2 text-on-surface-variant font-label-md text-[11px]">
                    <div className="flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[14px]">group</span>
                      {p.builders}
                    </div>
                    <div className="flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[14px]">signal_cellular_alt</span>
                      {p.level}
                    </div>
                    <div className="flex items-center gap-xs col-span-2">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      Role: {p.role}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {(Array.isArray(p.tech) ? p.tech : (typeof p.tech === 'string' ? p.tech.split(',') : [])).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-1 bg-primary/5 text-primary border border-primary/10 rounded font-label-md text-[10px]"
                      >
                        {String(t).trim()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-md border-t border-outline-variant mt-auto">
                  <button
                    type="button"
                    onClick={() => navigate('/view-project', { state: { project: p, from: 'my-projects' } })}
                    className="w-full py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-body-md text-body-md hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    View Project
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 text-outline">group_off</span>
              <p className="font-body-lg font-medium">No joined projects yet.</p>
              <p className="text-sm mt-1">Explore projects and apply to join teams to build together.</p>
            </div>
          )}
        </div>
      )}

      {/* Projects Grid for Created by Me */}
      {activeTab === 'created' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-lg">
          {createdList.length > 0 ? (
            createdList.map((project) => {
              const totalOpenings = project?.roles?.reduce((acc, r) => acc + (parseInt(r.openings, 10) || 1), 0) || 0;
              const displayCapacity = totalOpenings > 0 
                ? `${totalOpenings} ${totalOpenings === 1 ? 'Builder' : 'Builders'}`
                : (project.builders || project.teamSize || '5 Builders');
              return (
              <div
                key={project.id}
                onClick={() => navigate('/view-project', { state: { project, from: 'my-projects' } })}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md transition-colors flex flex-col h-full cursor-pointer group shadow-sm hover:shadow-md hover:border-primary"
              >
                <div className="flex justify-between items-start mb-sm">
                  <div className="flex flex-col gap-xs">
                    <span className="font-label-md text-label-md text-primary font-semibold">{project.category}</span>
                    <h3 className="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-label-md text-label-md px-sm py-[2px] rounded-full border border-primary text-primary bg-primary/5">
                      {project.status}
                    </span>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const updated = await deleteUserCreatedProject(project.id, project.title);
                        setCreatedList(updated);
                        showToast(`Project "${project.title}" deleted.`);
                      }}
                      title="Delete Project"
                      className="p-1 rounded-lg text-on-surface-variant hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-xs mb-md">
                  <span className="font-label-md text-label-md px-sm py-[2px] bg-surface-container rounded text-on-surface-variant">
                    {project.level}
                  </span>
                  <span className="font-label-md text-label-md px-sm py-[2px] bg-surface-container rounded text-on-surface-variant">
                    {project.team}
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mb-lg flex-1 leading-relaxed">
                  {project.desc}
                </p>
                <div className="flex items-center justify-between border-t border-outline-variant pt-md mt-auto">
                  <div className="flex items-center gap-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    <span className="font-label-md text-label-md">{displayCapacity}</span>
                  </div>
                  <div className="flex gap-xs">
                    {(Array.isArray(project.tech) ? project.tech : (typeof project.tech === 'string' ? project.tech.split(',') : [])).map((t) => (
                      <span key={t} className="font-label-md text-label-md px-sm py-[2px] bg-primary-container/10 text-primary rounded">
                        {String(t).trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )})
          ) : (
            <div className="col-span-full py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 text-outline">folder_off</span>
              <p className="font-body-lg font-medium">No published projects created yet.</p>
              <p className="text-sm mt-1">Create and publish a new project to manage it here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
