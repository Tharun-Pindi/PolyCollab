import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getStoredData, setStoredData, getUserProfile } from '../lib/storage';

export default function ApplyToProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const { project, role } = location.state || {};

  const projectTitle = project?.title || 'Unknown Project';
  const projectCategory = project?.category || 'Project';
  const projectRole = role?.title || 'Contributor';

  const savedDraft = getStoredData('application_draft', null);

  const [whyJoin, setWhyJoin] = useState(savedDraft?.whyJoin || '');
  const [experience, setExperience] = useState(savedDraft?.experience || '');
  const [links, setLinks] = useState(savedDraft?.links || ['']);
  const [commPref, setCommPref] = useState(savedDraft?.commPref || 'whatsapp');
  const [commHandle, setCommHandle] = useState(savedDraft?.commHandle || '');
  const [submitted, setSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleAddLink = () => {
    setLinks([...links, '']);
  };

  const handleLinkChange = (index, value) => {
    const updated = [...links];
    updated[index] = value;
    setLinks(updated);
  };

  const handleSaveDraft = () => {
    const draftData = {
      whyJoin,
      experience,
      links,
      commPref,
      commHandle,
      savedAt: new Date().toISOString()
    };
    setStoredData('application_draft', draftData);
    showToast('Application draft saved successfully!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const currentUser = getUserProfile();
    if (project?.id && currentUser?.id) {
      try {
        await fetch('http://localhost:5000/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: project.id,
            applicant_id: currentUser.id,
            role_applied: projectRole,
            why_join: whyJoin,
            experience: experience,
            links: links.filter(l => l.trim() !== ''),
            comm_pref: commPref,
            comm_handle: commHandle
          })
        });
      } catch (err) {
        console.warn('Backend application submit notice:', err.message);
      }
    }

    setStoredData('application_draft', null); // Clear draft after submission
    setSubmitted(true);
  };

  const getCommHandlePlaceholder = () => {
    switch (commPref) {
      case 'whatsapp':
        return 'Enter your WhatsApp number...';
      default:
        return 'Enter your contact info...';
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-md lg:p-lg antialiased">
        {/* Confirmation Card */}
        <main className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-lg p-xl flex flex-col items-center text-center shadow-sm">
          {/* Logo */}
          <div className="mb-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-col items-center">
                <span className="font-headline-md text-headline-md text-on-surface font-bold">
                  PolyCollab
                </span>
              </div>
            </div>
          </div>

          {/* Success Icon */}
          <div className="mb-md flex items-center justify-center w-24 h-24 rounded-full bg-primary-fixed bg-opacity-30">
            <span className="material-symbols-outlined text-[64px] text-primary">
              check_circle
            </span>
          </div>

          {/* Typography */}
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-sm">
            Application Submitted!
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-xl max-w-sm">
            Your application to join{' '}
            <span className="font-title-md text-title-md font-semibold text-on-surface">
              {projectTitle}
            </span>{' '}
            has been sent to the project lead. You will be notified via Messages when they respond.
          </p>

          {/* CTA */}
          <button
            type="button"
            onClick={() => navigate('/explore-projects')}
            className="w-full bg-primary text-on-primary font-title-md text-title-md font-semibold py-sm px-lg rounded-lg hover:opacity-90 transition-opacity active:scale-[0.98] cursor-pointer"
          >
            Return to Explore
          </button>
        </main>
      </div>
    );
  }

  return (
    <main className="w-full max-w-[800px] mx-auto bg-surface-container-lowest rounded-xl border border-outline-variant p-lg md:p-xl shadow-sm my-6 relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce font-mono text-sm">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-outline-variant pb-lg mb-lg gap-md md:gap-0">
        <div className="flex items-center gap-md">
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md text-on-surface font-bold">
              PolyCollab
            </span>
            <h1 className="font-title-md text-title-md text-on-surface-variant font-medium">
              Apply to Project
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/explore-projects')}
          className="flex items-center gap-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
          <span className="font-mono text-label-md text-xs">Cancel</span>
        </button>
      </header>

      {/* Project Summary Context (Read-Only) */}
      <div className="bg-surface rounded-lg p-md mb-lg border border-outline-variant flex flex-col md:flex-row gap-md md:items-center justify-between">
        <div className="flex flex-col gap-sm">
          <span className="font-mono text-xs font-medium text-primary bg-primary-fixed w-fit px-sm py-xs rounded">
            {projectCategory}
          </span>
          <h2 className="font-title-md text-title-md text-on-surface font-bold">
            {projectTitle}
          </h2>
        </div>
        <div className="flex items-center gap-sm bg-surface-container-highest px-md py-sm rounded-md border border-outline-variant">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
            code
          </span>
          <span className="font-body-md text-body-md text-on-surface-variant">
            Applying for: <strong className="text-on-surface font-semibold">{projectRole}</strong>
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-xl">
        {/* Questions Section */}
        <section className="flex flex-col gap-lg">
          {/* Why join */}
          <div className="flex flex-col gap-sm">
            <label className="font-title-md text-title-md text-on-surface font-semibold flex items-center gap-1" htmlFor="why-join">
              Why do you want to join? <span className="text-error font-body-md text-body-md">*</span>
            </label>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Explain what draws you to this specific project and how your goals align.
            </p>
            <div className="relative rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200">
              <textarea
                id="why-join"
                name="why-join"
                rows={4}
                required
                value={whyJoin}
                onChange={(e) => setWhyJoin(e.target.value)}
                placeholder="I am excited about building resilient financial systems..."
                className="w-full p-md font-body-md text-body-md text-on-surface bg-transparent border-none focus:ring-0 resize-none outline-none"
              />
            </div>
          </div>

          {/* Relevant Experience */}
          <div className="flex flex-col gap-sm">
            <label className="font-title-md text-title-md text-on-surface font-semibold flex items-center gap-1" htmlFor="experience">
              Relevant Experience <span className="text-error font-body-md text-body-md">*</span>
            </label>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Highlight past projects or roles that prove you can excel in this position.
            </p>
            <div className="relative rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200">
              <textarea
                id="experience"
                name="experience"
                rows={5}
                required
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="In my last role, I led the development of a smart contract architecture that processed $10M in daily volume..."
                className="w-full p-md font-body-md text-body-md text-on-surface bg-transparent border-none focus:ring-0 resize-none outline-none"
              />
            </div>
          </div>
        </section>

        <hr className="border-outline-variant" />

        {/* Links & Comms Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          {/* Portfolio Links */}
          <div className="flex flex-col gap-sm">
            <label className="font-title-md text-title-md text-on-surface font-semibold">
              Portfolio / Links
            </label>
            <p className="font-body-md text-body-md text-on-surface-variant mb-xs">
              Share your GitHub, personal site, or previous work.
            </p>
            <div className="flex flex-col gap-md">
              {links.map((linkVal, idx) => (
                <div
                  key={idx}
                  className="flex items-center rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200 pl-sm"
                >
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                    link
                  </span>
                  <input
                    type="url"
                    value={linkVal}
                    onChange={(e) => handleLinkChange(idx, e.target.value)}
                    placeholder="https://github.com/yourusername"
                    className="w-full p-sm font-body-md text-body-md text-on-surface bg-transparent border-none focus:ring-0 outline-none"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddLink}
                className="flex items-center gap-sm text-primary font-mono text-xs font-medium w-fit hover:opacity-80 transition-opacity cursor-pointer mt-1"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add another link
              </button>
            </div>
          </div>

          {/* Communication Preference */}
          <div className="flex flex-col gap-sm">
            <label className="font-title-md text-title-md text-on-surface font-semibold" htmlFor="comm-pref">
              Communication Preference
            </label>
            <p className="font-body-md text-body-md text-on-surface-variant mb-xs">
              How should the project lead contact you?
            </p>

            <div className="relative rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200">
              <select
                id="comm-pref"
                name="comm-pref"
                value={commPref}
                onChange={(e) => setCommPref(e.target.value)}
                className="w-full p-md pr-xl font-body-md text-body-md text-on-surface bg-transparent border-none focus:ring-0 outline-none appearance-none cursor-pointer"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
              <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">
                expand_more
              </span>
            </div>

            {commPref !== 'email' && (
              <div className="mt-sm flex items-center rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200 pl-sm">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                  person
                </span>
                <input
                  id="comm-handle"
                  type="text"
                  value={commHandle}
                  onChange={(e) => setCommHandle(e.target.value)}
                  placeholder={getCommHandlePlaceholder()}
                  className="w-full p-sm font-body-md text-body-md text-on-surface bg-transparent border-none focus:ring-0 outline-none"
                />
              </div>
            )}
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse md:flex-row justify-end gap-md pt-lg border-t border-outline-variant mt-sm">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-lg py-sm rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-mono text-xs font-medium hover:bg-surface-container-low transition-colors duration-200 cursor-pointer active:scale-95"
          >
            Save Draft
          </button>
          <button
            type="submit"
            className="px-lg py-sm rounded-lg bg-primary text-on-primary font-mono text-xs font-semibold hover:opacity-90 transition-opacity duration-200 shadow-sm flex items-center justify-center gap-sm cursor-pointer active:scale-95"
          >
            Submit Application
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
      </form>
    </main>
  );
}
