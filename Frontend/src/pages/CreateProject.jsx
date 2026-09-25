import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addUserDraft, addUserCreatedProject } from '../lib/storage';

export default function CreateProject() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    category: 'Select Category...',
    stage: 'Idea / Conceptual',
    shortDesc: '',
    projectType: 'Commercial',
    expLevel: 'Mixed',
    teamSize: '',
    duration: 'Less than 1 month',
    commitment: 'Part-time (< 10 hrs/wk)',
    goal: '',
    communication: 'WhatsApp',
    visibility: 'Public',
    refLink: '',
    overview: ''
  });

  const [techStack, setTechStack] = useState([]);
  const [techInput, setTechInput] = useState('');
  const [roles, setRoles] = useState([]);
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newRoleSkills, setNewRoleSkills] = useState('');
  const [newRoleOpenings, setNewRoleOpenings] = useState('1');

  const addRole = () => {
    if (!newRoleTitle.trim()) return;
    const newId = Date.now();
    const openingsNum = parseInt(newRoleOpenings, 10) || 1;
    setRoles([
      ...roles,
      {
        id: newId,
        title: newRoleTitle.trim(),
        skills: newRoleSkills.trim() || 'General Development',
        openings: openingsNum
      }
    ]);
    setNewRoleTitle('');
    setNewRoleSkills('');
    setNewRoleOpenings('1');
  };

  const updateRoleOpenings = (id, newOpenings) => {
    setRoles(roles.map((r) => (r.id === id ? { ...r, openings: parseInt(newOpenings, 10) || 1 } : r)));
  };

  const removeRole = (id) => {
    setRoles(roles.filter((r) => r.id !== id));
  };

  const addTech = () => {
    if (techInput.trim() && !techStack.includes(techInput.trim())) {
      setTechStack([...techStack, techInput.trim()]);
      setTechInput('');
    }
  };

  const removeTech = (tech) => {
    setTechStack(techStack.filter((t) => t !== tech));
  };

  const handleSaveDraftClick = () => {
    const draftTitle = formData.title.trim() || 'Untitled Draft';
    const draftCategory = formData.category !== 'Select Category...' ? formData.category : 'Web Application';
    const draftDesc = formData.shortDesc.trim() || formData.overview.trim() || 'Draft project details under development.';

    addUserDraft({
      id: `draft-${Date.now()}`,
      category: draftCategory.toUpperCase(),
      title: draftTitle,
      desc: draftDesc,
      level: formData.expLevel || 'Intermediate',
      builders: formData.teamSize || '',
      updated: 'Just now'
    });

    navigate('/my-projects?tab=drafts');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const projTitle = formData.title.trim() || 'New Project';
    const projCategory = formData.category !== 'Select Category...' ? formData.category : 'Web Application';

    // Only include team capacity if user explicitly selected one
    const hasTeamSize = formData.teamSize && formData.teamSize !== '';
    const selectedTeamCapacity = hasTeamSize ? parseInt(formData.teamSize, 10) : null;

    const finalRoles = roles.map((r) => ({
      title: r.title,
      skills: r.skills,
      openings: parseInt(r.openings, 10) || 1,
      description: `Seeking ${r.title} (${r.openings || 1} ${parseInt(r.openings, 10) === 1 ? 'opening' : 'openings'}) proficient in ${r.skills}.`
    }));

    const cleanShort = formData.shortDesc.trim();
    const cleanOverview = formData.overview.trim();

    await addUserCreatedProject({
      id: `proj-${Date.now()}`,
      category: projCategory,
      title: projTitle,
      status: 'Open',
      statusType: 'open',
      stage: formData.stage,
      level: formData.expLevel || 'Intermediate',
      teamSize: hasTeamSize ? `${selectedTeamCapacity} ${selectedTeamCapacity === 1 ? 'Builder' : 'Builders'}` : '',
      team: hasTeamSize ? `Team: ${selectedTeamCapacity} ${selectedTeamCapacity === 1 ? 'Builder' : 'Builders'}` : '',
      shortDesc: cleanShort || '',
      desc: cleanShort || '',
      overview: cleanOverview || '',
      builders: hasTeamSize ? `${selectedTeamCapacity} ${selectedTeamCapacity === 1 ? 'Builder' : 'Builders'}` : '',
      tech: techStack,
      roles: finalRoles,
      duration: formData.duration,
      commitment: formData.commitment,
      goal: formData.goal,
      communication: formData.communication,
      visibility: formData.visibility,
      refLink: formData.refLink
    }).catch(err => console.error("Background create project error:", err));

    navigate('/my-projects?tab=created');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Title */}
      <div className="mb-8">
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold mb-2">Create New Project</h1>
        <p className="text-on-surface-variant font-body-lg">
          Define your project details to find the right builders and start collaborating.
        </p>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); }} className="space-y-6">
        {/* Section 1: Basic Information */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h2 className="font-title-md text-title-md border-b border-outline-variant pb-3 mb-4 text-on-surface font-semibold">
            1. Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Project Title</label>
              <input
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="e.g. NextGen Analytics Dashboard"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Project Category</label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-3 pr-10 py-2 text-on-surface font-body-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Select Category...">Select Category...</option>
                    <option value="Web Application">Web Application</option>
                    <option value="Mobile App">Mobile App</option>
                    <option value="Open Source Tool">Open Source Tool</option>
                    <option value="AI / ML">AI / ML</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">expand_more</span>
                </div>
              </div>

              <div>
                <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Project Stage</label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-3 pr-10 py-2 text-on-surface font-body-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  >
                    <option value="Idea / Conceptual">Idea / Conceptual</option>
                    <option value="Prototyping">Prototyping</option>
                    <option value="In Development">In Development</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">expand_more</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Short Description</label>
              <textarea
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-md resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Briefly describe what you are building..."
                rows={3}
                value={formData.shortDesc}
                onChange={(e) => setFormData({ ...formData, shortDesc: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Project Details */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h2 className="font-title-md text-title-md border-b border-outline-variant pb-3 mb-4 text-on-surface font-semibold">
            2. Project Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Project Type</label>
              <div className="relative">
                <select
                  className="w-full border border-outline-variant rounded-lg pl-3 pr-10 py-2 text-on-surface bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                >
                  <option value="Commercial">Commercial</option>
                  <option value="Open Source">Open Source</option>
                  <option value="Hobby">Hobby</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">expand_more</span>
              </div>
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Experience Level</label>
              <div className="relative">
                <select
                  className="w-full border border-outline-variant rounded-lg pl-3 pr-10 py-2 text-on-surface bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                  value={formData.expLevel}
                  onChange={(e) => setFormData({ ...formData, expLevel: e.target.value })}
                >
                  <option value="Mixed">Mixed</option>
                  <option value="Beginner Friendly">Beginner Friendly</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">expand_more</span>
              </div>
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Team Size (Max Capacity)</label>
              <div className="relative">
                <select
                  className="w-full border border-outline-variant rounded-lg pl-3 pr-10 py-2 text-on-surface bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                  value={formData.teamSize}
                  onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                >
                  <option value="">Select Team Size...</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={`${num} Builders`}>
                      {num} {num === 1 ? 'Builder' : 'Builders'}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">expand_more</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Duration</label>
              <div className="relative">
                <select
                  className="w-full border border-outline-variant rounded-lg pl-3 pr-10 py-2 text-on-surface bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                >
                  <option value="Less than 1 month">Less than 1 month</option>
                  <option value="1-3 months">1-3 months</option>
                  <option value="3-6 months">3-6 months</option>
                  <option value="6+ months">6+ months</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">expand_more</span>
              </div>
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Commitment</label>
              <div className="relative">
                <select
                  className="w-full border border-outline-variant rounded-lg pl-3 pr-10 py-2 text-on-surface bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                  value={formData.commitment}
                  onChange={(e) => setFormData({ ...formData, commitment: e.target.value })}
                >
                  <option value="Part-time (< 10 hrs/wk)">Part-time (&lt; 10 hrs/wk)</option>
                  <option value="Half-time (10-20 hrs/wk)">Half-time (10-20 hrs/wk)</option>
                  <option value="Full-time (40 hrs/wk)">Full-time (40 hrs/wk)</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">expand_more</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Project Goal</label>
            <input
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="e.g. Launch MVP and get first 100 users"
              type="text"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
            />
          </div>
        </section>

        {/* Section 3: Open Roles */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h2 className="font-title-md text-title-md border-b border-outline-variant pb-3 mb-4 text-on-surface font-semibold">
            3. Open Roles
          </h2>
          <div className="space-y-4">
            {roles.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic">No specific roles added yet. Use the fields below to add required roles for your project.</p>
            ) : (
              roles.map((role) => (
                <div
                  key={role.id}
                  className="border border-outline-variant rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between bg-surface-container-lowest gap-3 shadow-xs"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-title-md text-on-surface font-semibold">{role.title}</h3>
                      <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-xs font-mono font-bold">
                        {role.openings} {role.openings === 1 ? 'Opening' : 'Openings'}
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-body-md mt-1">{role.skills}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <select
                        value={role.openings}
                        onChange={(e) => updateRoleOpenings(role.id, e.target.value)}
                        className="border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface bg-surface-container-lowest outline-none cursor-pointer pr-7 font-medium"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? 'Opening' : 'Openings'}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px] pointer-events-none">expand_more</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRole(role.id)}
                      className="text-error hover:text-red-700 transition-colors p-1.5 cursor-pointer rounded-lg hover:bg-error/5"
                      title="Remove Role"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-low/50 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">Add New Role to Project</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Role Title (e.g. Frontend Engineer)"
                  value={newRoleTitle}
                  onChange={(e) => setNewRoleTitle(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-md text-sm outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="Required Skills (e.g. React, Tailwind)"
                  value={newRoleSkills}
                  onChange={(e) => setNewRoleSkills(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-md text-sm outline-none focus:border-primary"
                />
                <div className="relative">
                  <select
                    value={newRoleOpenings}
                    onChange={(e) => setNewRoleOpenings(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-md text-sm outline-none focus:border-primary appearance-none cursor-pointer pr-8"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num.toString()}>
                        {num} {num === 1 ? 'Opening for this Role' : 'Openings for this Role'}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[18px]">expand_more</span>
                </div>
              </div>
              <button
                type="button"
                onClick={addRole}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span> Add Role to Project
              </button>
            </div>
          </div>
        </section>

        {/* Section 4: Tech & Collaboration */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h2 className="font-title-md text-title-md border-b border-outline-variant pb-3 mb-4 text-on-surface font-semibold">
            4. Tech &amp; Collaboration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Tech Stack</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {techStack.map((tech) => (
                  <span
                    key={tech}
                    className="bg-surface-container-high text-on-surface px-3 py-1 rounded-full text-body-md flex items-center gap-1.5 border border-outline-variant/50"
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTech(tech)}
                      className="hover:text-error text-on-surface-variant transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  placeholder="Type a technology (e.g. React, Kotlin)..."
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTech();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addTech}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span> Add Tech
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Communication Method</label>
                <div className="relative">
                  <select
                    className="w-full border border-outline-variant rounded-lg pl-3 pr-10 py-2 text-on-surface bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                    value={formData.communication}
                    onChange={(e) => setFormData({ ...formData, communication: e.target.value })}
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Telegram">Telegram</option>
                    <option value="Email">Email</option>
                    <option value="Async First">Async First</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">expand_more</span>
                </div>
              </div>

              <div>
                <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Project Visibility</label>
                <div className="relative">
                  <select
                    className="w-full border border-outline-variant rounded-lg pl-3 pr-10 py-2 text-on-surface bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  >
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">expand_more</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant mb-1 font-medium">Communication Link</label>
              <input
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="e.g. WhatsApp group link, Telegram link, Email address, etc."
                type="text"
                value={formData.refLink}
                onChange={(e) => setFormData({ ...formData, refLink: e.target.value })}
              />
            </div>

            {/* Red Note: Chat option unavailable */}
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2 mt-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>Notice: In-app chat option is currently unavailable. Please provide your direct WhatsApp or Communication Link for team contact.</span>
            </div>
          </div>
        </section>

        {/* Section 5: Project Overview */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h2 className="font-title-md text-title-md border-b border-outline-variant pb-3 mb-4 text-on-surface font-semibold">
            5. Project Overview
          </h2>
          <div className="border border-outline-variant rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
            <div className="bg-surface-container flex items-center gap-1 p-2 border-b border-outline-variant">
              <button
                type="button"
                className="p-1 hover:bg-surface-container-highest rounded text-on-surface-variant cursor-pointer"
                title="Bold"
              >
                <span className="material-symbols-outlined text-[20px]">format_bold</span>
              </button>
              <button
                type="button"
                className="p-1 hover:bg-surface-container-highest rounded text-on-surface-variant cursor-pointer"
                title="Italic"
              >
                <span className="material-symbols-outlined text-[20px]">format_italic</span>
              </button>
              <button
                type="button"
                className="p-1 hover:bg-surface-container-highest rounded text-on-surface-variant cursor-pointer"
                title="Underline"
              >
                <span className="material-symbols-outlined text-[20px]">format_underlined</span>
              </button>
              <div className="w-px h-4 bg-outline-variant mx-1"></div>
              <button
                type="button"
                className="p-1 hover:bg-surface-container-highest rounded text-on-surface-variant cursor-pointer"
                title="Bulleted List"
              >
                <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
              </button>
              <button
                type="button"
                className="p-1 hover:bg-surface-container-highest rounded text-on-surface-variant cursor-pointer"
                title="Numbered List"
              >
                <span className="material-symbols-outlined text-[20px]">format_list_numbered</span>
              </button>
            </div>
            <textarea
              className="w-full bg-surface-container-lowest px-4 py-3 text-on-surface font-body-md resize-y min-h-[200px] outline-none border-none"
              placeholder="Provide a detailed description of your project..."
              value={formData.overview}
              onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
            />
          </div>
        </section>



        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleSaveDraftClick}
            className="px-6 py-2.5 border border-outline-variant rounded-lg text-on-surface bg-surface-container-lowest hover:bg-surface-container-highest transition-colors font-body-md font-medium cursor-pointer"
          >
            Save Draft
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors font-body-md font-medium shadow-sm cursor-pointer"
            style={{ backgroundColor: 'rgb(99, 102, 241)' }}
          >
            Publish Project
          </button>
        </div>
      </form>
    </div>
  );
}
