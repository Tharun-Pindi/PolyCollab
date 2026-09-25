import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, saveUserProfile, addNotification } from '../lib/storage';
import { supabase } from '../lib/supabase';


export default function CreateProfile() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 Form State (Empty initial values so placeholders show)
  const [basicInfo, setBasicInfo] = useState({
    fullName: '',
    title: '',
    location: '',
    bio: '',
    github: '',
    website: ''
  });

  useEffect(() => {
    // Ensure the user is authenticated before allowing them to use the wizard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login', { replace: true });
        return;
      }
    });

    const current = getUserProfile();
    if (current) {
      setBasicInfo((prev) => ({
        fullName: prev.fullName || current.fullName || '',
        title: prev.title || current.title || '',
        location: prev.location || current.location || '',
        bio: prev.bio || current.bio || '',
        github: prev.github || current.github || '',
        website: prev.website || current.website || ''
      }));
    }
  }, [navigate]);


  // Step 2 Form State (Empty initial tech stacks)
  const [techStack, setTechStack] = useState({
    languages: [],
    frontend: [],
    backend: []
  });

  const [langInput, setLangInput] = useState('');
  const [frontendInput, setFrontendInput] = useState('');
  const [backendInput, setBackendInput] = useState('');

  // Step 3 Form State (Experience)
  const [roles, setRoles] = useState([
    {
      id: 1,
      company: '',
      title: '',
      startDate: '',
      endDate: '',
      current: false,
      achievements: '',
      certificate: null
    }
  ]);

  const [projects, setProjects] = useState([
    {
      id: 1,
      title: '',
      status: 'Completed',
      techTags: [],
      link: '',
      techInput: ''
    }
  ]);

  // Step 4 Form State (Preferences)
  const [preferences, setPreferences] = useState({
    projectStyle: 'Early Stage', // 'Early Stage', 'Open Source', 'Enterprise'
    roleInteraction: 'Tech Lead', // 'Individual Contributor', 'Tech Lead', 'Subject Matter Expert'
    communication: 'Async First' // 'Async First', 'Sync / Meetings'
  });

  // Handlers for Step 2 Tag Add/Remove
  const addTag = (category, value, setInput) => {
    if (value.trim() && !techStack[category].includes(value.trim())) {
      setTechStack({
        ...techStack,
        [category]: [...techStack[category], value.trim()]
      });
      setInput('');
      setErrorMsg('');
    }
  };

  const removeTag = (category, item) => {
    setTechStack({
      ...techStack,
      [category]: techStack[category].filter((t) => t !== item)
    });
  };

  const addSuggestion = (category, item) => {
    if (!techStack[category].includes(item)) {
      setTechStack({
        ...techStack,
        [category]: [...techStack[category], item]
      });
      setErrorMsg('');
    }
  };

  // Handlers for Step 3 Roles & Projects
  const addRole = () => {
    setRoles([
      ...roles,
      {
        id: Date.now(),
        company: '',
        title: '',
        startDate: '',
        endDate: '',
        current: false,
        achievements: '',
        certificate: null
      }
    ]);
  };

  const updateRole = (id, field, value) => {
    setRoles(roles.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setErrorMsg('');
  };

  const addProject = () => {
    setProjects([
      ...projects,
      {
        id: Date.now(),
        title: '',
        status: 'Completed',
        techTags: [],
        link: '',
        techInput: ''
      }
    ]);
  };

  const updateProject = (id, field, value) => {
    setProjects(prev => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    setErrorMsg('');
  };

  const updateMultipleProjectFields = (id, fields) => {
    setProjects(prev => prev.map((p) => (p.id === id ? { ...p, ...fields } : p)));
    setErrorMsg('');
  };

  const handleNext = async () => {
    setErrorMsg('');
    if (step === 1) {
      if (
        !basicInfo.fullName.trim() ||
        !basicInfo.title.trim() ||
        !basicInfo.location.trim() ||
        !basicInfo.bio.trim()
      ) {
        setErrorMsg('Please complete required fields (Full Name, Title, Location, Bio).');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      let finalLanguages = [...techStack.languages];
      if (langInput.trim() && !finalLanguages.includes(langInput.trim())) {
        finalLanguages.push(langInput.trim());
      }

      let finalFrontend = [...techStack.frontend];
      if (frontendInput.trim() && !finalFrontend.includes(frontendInput.trim())) {
        finalFrontend.push(frontendInput.trim());
      }

      let finalBackend = [...techStack.backend];
      if (backendInput.trim() && !finalBackend.includes(backendInput.trim())) {
        finalBackend.push(backendInput.trim());
      }

      setTechStack({
        languages: finalLanguages,
        frontend: finalFrontend,
        backend: finalBackend
      });

      if (finalLanguages.length === 0 || finalFrontend.length === 0 || finalBackend.length === 0) {
        setErrorMsg('All Tech Stack categories are required. Please add at least one item for Languages & Specialized Tech, Frontend, and Backend.');
        return;
      }
      setLangInput('');
      setFrontendInput('');
      setBackendInput('');
      setStep(3);
    } else if (step === 3) {
      // Professional Experience and Previous Projects fields are optional
      setStep(4);
    } else if (step === 4) {
      if (!preferences.projectStyle || !preferences.roleInteraction || !preferences.communication) {
        setErrorMsg('All Preference selections are required.');
        return;
      }
      setIsSubmitting(true);
      try {
        let user = null;
        try {
          const { data: userData } = await supabase.auth.getUser();
          user = userData?.user;
        } catch (e) {
          console.warn('Supabase getUser notice:', e);
        }

        const current = getUserProfile();

        const nameToUse = (basicInfo.fullName || current.fullName || '').trim();
        const nameParts = nameToUse.split(' ');
        const computedFirstName = nameParts[0] || '';
        const computedLastName = nameParts.slice(1).join(' ') || '';

        const fullProfile = {
          ...current,
          id: user?.id || current.id,
          primaryEmail: user?.email || current.primaryEmail,
          fullName: nameToUse,
          firstName: computedFirstName,
          lastName: computedLastName,
          title: basicInfo.title,
          location: basicInfo.location,
          bio: basicInfo.bio,
          github: basicInfo.github,
          website: basicInfo.website,
          techStack: {
            languages: techStack.languages,
            frontend: techStack.frontend,
            backend: techStack.backend
          },
          roles,
          projects,
          preferences
        };
        saveUserProfile(fullProfile).catch(err => console.error('Error completing profile:', err));
        addNotification({
          title: 'Profile Created Successfully',
          desc: `Welcome ${fullProfile.fullName}! Your builder profile is live and active.`,
          icon: 'account_circle',
          iconColor: 'text-emerald-500',
          category: 'projectUpdates'
        });
      } catch (err) {
        console.error('Error completing profile:', err);
      } finally {
        navigate('/dashboard');
      }
    }
  };


  const handleBack = () => {
    setErrorMsg('');
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const changeStep = (targetStep) => {
    if (targetStep <= step) {
      setErrorMsg('');
      setStep(targetStep);
    } else {
      handleNext();
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased font-body-lg flex flex-col">
      {/* Top Header */}
      <header className="bg-surface border-b border-outline-variant px-lg h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-md">
          <img
            src="/logo.png"
            alt="PolyCollab Logo"
            className="h-8 w-auto object-contain"
          />
          <span className="font-headline-md text-headline-md text-primary font-bold leading-none">PolyCollab</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-container-max mx-auto w-full px-lg py-xl grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-xl">
        <div className="space-y-xl">
          {/* Title Banner */}
          <div>
            <h1 className="font-headline-lg text-headline-lg mb-xs font-semibold">Create Your Profile</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Tell us about yourself to connect with the right builders and projects.
            </p>
          </div>

          {/* Stepper Progress Header */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
            <div className="flex items-center justify-between relative">
              {/* Line background */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-surface-variant z-0"></div>
              {/* Active progress line */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary z-0 transition-all duration-500"
                style={{
                  width: step === 1 ? '0%' : step === 2 ? '33.33%' : step === 3 ? '66.66%' : '100%'
                }}
              ></div>

              {[
                { num: 1, label: 'Basic Info' },
                { num: 2, label: 'Tech Stack' },
                { num: 3, label: 'Experience' },
                { num: 4, label: 'Preferences' }
              ].map((item) => {
                const isCompleted = step > item.num;
                const isCurrent = step === item.num;
                return (
                  <div
                    key={item.num}
                    className="flex flex-col items-center gap-xs relative z-10 cursor-pointer"
                    onClick={() => changeStep(item.num)}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md transition-all shadow-[0_0_0_4px_theme(colors.surface-container-lowest)] ${
                        isCurrent
                          ? step === 1
                            ? 'bg-primary text-on-primary font-bold'
                            : 'border-2 border-primary bg-surface-container-lowest text-primary font-bold'
                          : isCompleted
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-variant text-on-surface-variant'
                      }`}
                    >
                      {isCompleted ? (
                        <span className="material-symbols-outlined text-[18px]">check</span>
                      ) : (
                        item.num
                      )}
                    </div>
                    <span
                      className={`font-label-md text-label-md ${
                        isCurrent || isCompleted ? 'text-primary font-medium' : 'text-on-surface-variant'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-error/10 border border-error/30 text-error p-4 rounded-lg flex items-center justify-between font-body-md text-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">error</span>
                <span>{errorMsg}</span>
              </div>
              <button type="button" onClick={() => setErrorMsg('')} className="hover:opacity-80 cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          )}

          {/* STEP 1: BASIC INFO */}
          {step === 1 && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg space-y-lg">
              <div className="flex items-center gap-sm border-b border-outline-variant pb-sm">
                <span className="material-symbols-outlined text-primary">person</span>
                <h2 className="font-title-md text-title-md font-semibold">Basic Info</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant block">
                    Full Name <span className="text-error">*</span>
                  </label>
                  <input
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-body-md text-body-md outline-none"
                    placeholder="Jane Doe"
                    type="text"
                    value={basicInfo.fullName}
                    onChange={(e) => {
                      setBasicInfo({ ...basicInfo, fullName: e.target.value });
                      setErrorMsg('');
                    }}
                  />
                </div>
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant block">
                    Professional Title <span className="text-error">*</span>
                  </label>
                  <input
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-body-md text-body-md outline-none"
                    placeholder="Full Stack Developer"
                    type="text"
                    value={basicInfo.title}
                    onChange={(e) => {
                      setBasicInfo({ ...basicInfo, title: e.target.value });
                      setErrorMsg('');
                    }}
                  />
                </div>
                <div className="space-y-xs md:col-span-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block">
                    Location <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline">
                      location_on
                    </span>
                    <input
                      required
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-[40px] pr-md py-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-body-md text-body-md outline-none"
                      placeholder="San Francisco, CA (or Remote)"
                      type="text"
                      value={basicInfo.location}
                      onChange={(e) => {
                        setBasicInfo({ ...basicInfo, location: e.target.value });
                        setErrorMsg('');
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-xs md:col-span-2">
                  <label className="font-label-md text-label-md text-on-surface-variant block">
                    Focused Bio <span className="text-error">*</span>
                  </label>
                  <textarea
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-body-md text-body-md outline-none resize-none"
                    placeholder="Briefly describe your expertise, passions, and what you're looking to build..."
                    rows={4}
                    value={basicInfo.bio}
                    onChange={(e) => {
                      setBasicInfo({ ...basicInfo, bio: e.target.value });
                      setErrorMsg('');
                    }}
                  />
                  <p className="font-body-md text-body-md text-outline text-right text-xs">
                    {basicInfo.bio.length}/500
                  </p>
                </div>
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant block">
                    GitHub Profile <span className="text-xs text-outline">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline">
                      code
                    </span>
                    <input
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-[40px] pr-md py-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-body-md text-body-md outline-none"
                      placeholder="https://github.com/username"
                      type="url"
                      value={basicInfo.github}
                      onChange={(e) => {
                        setBasicInfo({ ...basicInfo, github: e.target.value });
                        setErrorMsg('');
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant block">
                    Personal Website <span className="text-xs text-outline">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline">
                      language
                    </span>
                    <input
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-[40px] pr-md py-sm focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-body-md text-body-md outline-none"
                      placeholder="https://yourdomain.com"
                      type="url"
                      value={basicInfo.website}
                      onChange={(e) => {
                        setBasicInfo({ ...basicInfo, website: e.target.value });
                        setErrorMsg('');
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TECH STACK */}
          {step === 2 && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg space-y-lg shadow-sm">
              {/* Section 1: Languages & Specialized Tech */}
              <div className="flex flex-col gap-sm">
                <label className="font-title-md text-title-md font-semibold text-on-surface">
                  Languages & Specialized Tech <span className="text-error">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-md top-1/2 transform -translate-y-1/2 text-secondary">
                      search
                    </span>
                    <input
                      className="w-full pl-[40px] pr-md py-sm border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none font-body-md text-body-md text-on-surface bg-surface transition-all"
                      placeholder="Type a language or tech (e.g. TypeScript, Solidity, Web3)..."
                      type="text"
                      value={langInput}
                      onChange={(e) => {
                        setLangInput(e.target.value);
                        setErrorMsg('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('languages', langInput, setLangInput))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => addTag('languages', langInput, setLangInput)}
                    className="px-4 py-2 bg-primary text-on-primary font-label-md text-sm rounded-lg hover:bg-primary-container transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span> Add Tag
                  </button>
                </div>
                {/* Popular Pills */}
                <div className="flex flex-wrap gap-xs items-center text-xs text-on-surface-variant">
                  <span className="font-semibold text-outline">Quick add:</span>
                  {['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Solidity', 'Web3', 'AI/ML'].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => addSuggestion('languages', suggestion)}
                      className="px-2.5 py-0.5 bg-surface-container hover:bg-primary/10 hover:text-primary rounded-full border border-outline-variant/60 cursor-pointer transition-colors text-[12px]"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-sm mt-xs">
                  {techStack.languages.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-xs bg-primary/10 text-primary font-semibold text-body-md px-sm py-xs border border-primary/20 rounded-full"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeTag('languages', item)}
                        className="text-primary hover:text-error transition-colors flex items-center ml-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-outline-variant w-full"></div>

              {/* Section 2: Frontend */}
              <div className="flex flex-col gap-sm">
                <label className="font-title-md text-title-md font-semibold text-on-surface">
                  Frontend <span className="text-error">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-md top-1/2 transform -translate-y-1/2 text-secondary">
                      search
                    </span>
                    <input
                      className="w-full pl-[40px] pr-md py-sm border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none font-body-md text-body-md text-on-surface bg-surface transition-all"
                      placeholder="Type a framework (e.g. React, Next.js)..."
                      type="text"
                      value={frontendInput}
                      onChange={(e) => {
                        setFrontendInput(e.target.value);
                        setErrorMsg('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('frontend', frontendInput, setFrontendInput))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => addTag('frontend', frontendInput, setFrontendInput)}
                    className="px-4 py-2 bg-primary text-on-primary font-label-md text-sm rounded-lg hover:bg-primary-container transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span> Add Tag
                  </button>
                </div>
                {/* Popular Pills */}
                <div className="flex flex-wrap gap-xs items-center text-xs text-on-surface-variant">
                  <span className="font-semibold text-outline">Quick add:</span>
                  {['React', 'Next.js', 'Vue', 'Tailwind CSS', 'Angular', 'Svelte'].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => addSuggestion('frontend', suggestion)}
                      className="px-2.5 py-0.5 bg-surface-container hover:bg-primary/10 hover:text-primary rounded-full border border-outline-variant/60 cursor-pointer transition-colors text-[12px]"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-sm mt-xs">
                  {techStack.frontend.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-xs bg-primary/10 text-primary font-semibold text-body-md px-sm py-xs border border-primary/20 rounded-full"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeTag('frontend', item)}
                        className="text-primary hover:text-error transition-colors flex items-center ml-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-outline-variant w-full"></div>

              {/* Section 3: Backend & Infra */}
              <div className="flex flex-col gap-sm">
                <label className="font-title-md text-title-md font-semibold text-on-surface">
                  Backend & Infra <span className="text-error">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-md top-1/2 transform -translate-y-1/2 text-secondary">
                      search
                    </span>
                    <input
                      className="w-full pl-[40px] pr-md py-sm border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none font-body-md text-body-md text-on-surface bg-surface transition-all"
                      placeholder="Type a backend tool (e.g. Node.js, PostgreSQL)..."
                      type="text"
                      value={backendInput}
                      onChange={(e) => {
                        setBackendInput(e.target.value);
                        setErrorMsg('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('backend', backendInput, setBackendInput))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => addTag('backend', backendInput, setBackendInput)}
                    className="px-4 py-2 bg-primary text-on-primary font-label-md text-sm rounded-lg hover:bg-primary-container transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span> Add Tag
                  </button>
                </div>
                {/* Popular Pills */}
                <div className="flex flex-wrap gap-xs items-center text-xs text-on-surface-variant">
                  <span className="font-semibold text-outline">Quick add:</span>
                  {['Node.js', 'PostgreSQL', 'Docker', 'Redis', 'GraphQL', 'AWS'].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => addSuggestion('backend', suggestion)}
                      className="px-2.5 py-0.5 bg-surface-container hover:bg-primary/10 hover:text-primary rounded-full border border-outline-variant/60 cursor-pointer transition-colors text-[12px]"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-sm mt-xs">
                  {techStack.backend.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-xs bg-primary/10 text-primary font-semibold text-body-md px-sm py-xs border border-primary/20 rounded-full"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeTag('backend', item)}
                        className="text-primary hover:text-error transition-colors flex items-center ml-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: EXPERIENCE */}
          {step === 3 && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg space-y-lg shadow-sm">
              {/* Professional Experience Section */}
              <section className="flex flex-col gap-md">
                <div className="flex items-center justify-between">
                  <h2 className="font-title-md text-title-md font-semibold text-on-surface">Professional Experience</h2>
                  <span className="text-xs font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant">Optional</span>
                </div>
                {roles.map((role, idx) => (
                  <div key={role.id} className="space-y-md border-b border-outline-variant/60 pb-md last:border-0 last:pb-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                      <div>
                        <label className="font-label-md text-label-md text-secondary mb-xs block">Company Name</label>
                        <input
                          className="w-full px-sm py-sm border border-outline-variant rounded-lg focus:border-primary outline-none font-body-md"
                          placeholder="e.g. Google"
                          type="text"
                          value={role.company}
                          onChange={(e) => updateRole(role.id, 'company', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="font-label-md text-label-md text-secondary mb-xs block">Professional Title</label>
                        <input
                          className="w-full px-sm py-sm border border-outline-variant rounded-lg focus:border-primary outline-none font-body-md"
                          placeholder="e.g. Senior Frontend Engineer"
                          type="text"
                          value={role.title}
                          onChange={(e) => updateRole(role.id, 'title', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                      <div>
                        <label className="font-label-md text-label-md text-secondary mb-xs block">Start Date</label>
                        <input
                          className="w-full px-sm py-sm border border-outline-variant rounded-lg focus:border-primary outline-none font-body-md"
                          type="date"
                          value={role.startDate}
                          onChange={(e) => updateRole(role.id, 'startDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="font-label-md text-label-md text-secondary mb-xs block">End Date</label>
                        <div className="flex flex-col gap-xs">
                          <input
                            className="w-full px-sm py-sm border border-outline-variant rounded-lg focus:border-primary outline-none font-body-md"
                            type="date"
                            disabled={role.current}
                            value={role.current ? '' : role.endDate}
                            onChange={(e) => updateRole(role.id, 'endDate', e.target.value)}
                          />
                          <label className="flex items-center gap-xs font-body-md text-sm text-secondary mt-xs cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded border-outline-variant text-primary focus:ring-primary"
                              checked={role.current}
                              onChange={(e) => updateRole(role.id, 'current', e.target.checked)}
                            />
                            I currently work here
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="font-label-md text-label-md text-secondary mb-xs block">Key Achievements</label>
                      <textarea
                        className="w-full px-sm py-sm border border-outline-variant rounded-lg focus:border-primary outline-none font-body-md min-h-[100px]"
                        placeholder="Describe your impact and responsibilities..."
                        value={role.achievements}
                        onChange={(e) => updateRole(role.id, 'achievements', e.target.value)}
                      />
                    </div>

                    <div className="mt-md">
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addRole}
                  className="flex items-center gap-xs text-primary font-label-md hover:text-primary-container transition-colors cursor-pointer w-fit mt-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Add Another Role
                </button>
              </section>

              <div className="h-px bg-outline-variant w-full"></div>

              {/* Previous Projects Section */}
              <section className="flex flex-col gap-md">
                <div className="flex items-center justify-between">
                  <h2 className="font-title-md text-title-md font-semibold text-on-surface">Previous Projects</h2>
                  <span className="text-xs font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant">Optional</span>
                </div>
                {projects.map((proj) => (
                  <div key={proj.id} className="space-y-md border-b border-outline-variant/60 pb-md last:border-0 last:pb-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                      <div>
                        <label className="font-label-md text-label-md text-secondary mb-xs block">Project Title</label>
                        <input
                          className="w-full px-sm py-sm border border-outline-variant rounded-lg focus:border-primary outline-none font-body-md"
                          placeholder="e.g. Open Source Library"
                          type="text"
                          value={proj.title}
                          onChange={(e) => updateProject(proj.id, 'title', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="font-label-md text-label-md text-secondary mb-xs block">Status</label>
                        <div className="relative">
                          <select
                            className="w-full px-sm py-sm pr-8 border border-outline-variant rounded-lg focus:border-primary outline-none font-body-md bg-surface appearance-none cursor-pointer"
                            value={proj.status}
                            onChange={(e) => updateProject(proj.id, 'status', e.target.value)}
                          >
                            <option value="Completed">Completed</option>
                            <option value="In Progress">In Progress</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">expand_more</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="font-label-md text-label-md text-secondary mb-xs block">Tech Stacks</label>
                      <div className="flex flex-col gap-sm">
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 px-sm py-sm border border-outline-variant rounded-lg focus:border-primary outline-none font-body-md"
                            placeholder="e.g. React, Node.js, AWS"
                            type="text"
                            value={proj.techInput || ''}
                            onChange={(e) => updateProject(proj.id, 'techInput', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = (proj.techInput || '').trim();
                                const currentTags = Array.isArray(proj.techTags) ? proj.techTags : [];
                                if (val && !currentTags.includes(val)) {
                                  updateMultipleProjectFields(proj.id, {
                                    techTags: [...currentTags, val],
                                    techInput: ''
                                  });
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0 flex items-center gap-1"
                            onClick={() => {
                              const val = (proj.techInput || '').trim();
                              const currentTags = Array.isArray(proj.techTags) ? proj.techTags : [];
                              if (val && !currentTags.includes(val)) {
                                updateMultipleProjectFields(proj.id, {
                                  techTags: [...currentTags, val],
                                  techInput: ''
                                });
                              }
                            }}
                          >
                            <span className="material-symbols-outlined text-[18px]">add</span> Add Tech Stack
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-sm mt-xs">
                          {(Array.isArray(proj.techTags) ? proj.techTags : []).map((tag) => (
                            <div
                              key={tag}
                              className="flex items-center gap-xs bg-primary/10 text-primary font-semibold text-body-md px-sm py-xs border border-primary/20 rounded-full"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => {
                                  updateProject(
                                    proj.id,
                                    'techTags',
                                    (Array.isArray(proj.techTags) ? proj.techTags : []).filter((t) => t !== tag)
                                  );
                                }}
                                className="text-primary hover:text-error transition-colors flex items-center ml-xs cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-md">
                      <label className="font-label-md text-label-md text-secondary mb-xs block">Project Link</label>
                      <input
                        className="w-full px-sm py-sm border border-outline-variant rounded-lg focus:border-primary outline-none font-body-md"
                        placeholder="e.g. github.com/project-repo"
                        type="url"
                        value={proj.link}
                        onChange={(e) => updateProject(proj.id, 'link', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addProject}
                  className="flex items-center gap-xs text-primary font-label-md hover:text-primary-container transition-colors cursor-pointer w-fit mt-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Add Another Project
                </button>
              </section>
            </div>
          )}

          {/* STEP 4: PREFERENCES */}
          {step === 4 && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg space-y-xl shadow-sm">
              {/* Project Style */}
              <div className="space-y-md">
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface-variant block mb-xs">
                    Project Style
                  </label>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    What kind of projects are you most interested in?
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                  {/* Early Stage */}
                  <button
                    type="button"
                    onClick={() => setPreferences({ ...preferences, projectStyle: 'Early Stage' })}
                    className={`flex flex-col items-start p-md rounded-lg text-left transition-all cursor-pointer ${
                      preferences.projectStyle === 'Early Stage'
                        ? 'border-2 border-primary bg-primary/5'
                        : 'border border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined mb-sm ${
                        preferences.projectStyle === 'Early Stage' ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      rocket_launch
                    </span>
                    <span className="font-title-md text-title-md font-semibold text-on-surface mb-xs">Early Stage</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      0 to 1 building, fast paced, high autonomy.
                    </span>
                  </button>

                  {/* Open Source */}
                  <button
                    type="button"
                    onClick={() => setPreferences({ ...preferences, projectStyle: 'Open Source' })}
                    className={`flex flex-col items-start p-md rounded-lg text-left transition-all cursor-pointer ${
                      preferences.projectStyle === 'Open Source'
                        ? 'border-2 border-primary bg-primary/5'
                        : 'border border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined mb-sm ${
                        preferences.projectStyle === 'Open Source' ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      public
                    </span>
                    <span className="font-title-md text-title-md font-semibold text-on-surface mb-xs">Open Source</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Public tools, community driven, collaborative.
                    </span>
                  </button>

                  {/* Enterprise */}
                  <button
                    type="button"
                    onClick={() => setPreferences({ ...preferences, projectStyle: 'Enterprise' })}
                    className={`flex flex-col items-start p-md rounded-lg text-left transition-all cursor-pointer ${
                      preferences.projectStyle === 'Enterprise'
                        ? 'border-2 border-primary bg-primary/5'
                        : 'border border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined mb-sm ${
                        preferences.projectStyle === 'Enterprise' ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      domain
                    </span>
                    <span className="font-title-md text-title-md font-semibold text-on-surface mb-xs">Enterprise</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Scale, stability, complex architectures.
                    </span>
                  </button>
                </div>
              </div>

              {/* Role Interaction */}
              <div className="space-y-md">
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface-variant block mb-xs">
                    Role Interaction
                  </label>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    How do you prefer to contribute to a team?
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                  {/* Individual Contributor */}
                  <button
                    type="button"
                    onClick={() => setPreferences({ ...preferences, roleInteraction: 'Individual Contributor' })}
                    className={`flex flex-col items-start p-md rounded-lg text-left transition-all cursor-pointer ${
                      preferences.roleInteraction === 'Individual Contributor'
                        ? 'border-2 border-primary bg-primary/5'
                        : 'border border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined mb-sm ${
                        preferences.roleInteraction === 'Individual Contributor' ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      directions_run
                    </span>
                    <span className="font-title-md text-title-md font-semibold text-on-surface mb-xs">
                      Individual Contributor
                    </span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Deep technical focus, shipping features.
                    </span>
                  </button>

                  {/* Tech Lead */}
                  <button
                    type="button"
                    onClick={() => setPreferences({ ...preferences, roleInteraction: 'Tech Lead' })}
                    className={`flex flex-col items-start p-md rounded-lg text-left transition-all cursor-pointer ${
                      preferences.roleInteraction === 'Tech Lead'
                        ? 'border-2 border-primary bg-primary/5'
                        : 'border border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined mb-sm ${
                        preferences.roleInteraction === 'Tech Lead' ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      group
                    </span>
                    <span className="font-title-md text-title-md font-semibold text-on-surface mb-xs">Tech Lead</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Architecture, mentoring, team enablement.
                    </span>
                  </button>

                  {/* Subject Matter Expert */}
                  <button
                    type="button"
                    onClick={() => setPreferences({ ...preferences, roleInteraction: 'Subject Matter Expert' })}
                    className={`flex flex-col items-start p-md rounded-lg text-left transition-all cursor-pointer ${
                      preferences.roleInteraction === 'Subject Matter Expert'
                        ? 'border-2 border-primary bg-primary/5'
                        : 'border border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined mb-sm ${
                        preferences.roleInteraction === 'Subject Matter Expert' ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      psychology
                    </span>
                    <span className="font-title-md text-title-md font-semibold text-on-surface mb-xs">
                      Subject Matter Expert
                    </span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Advising on specific deep tech challenges.
                    </span>
                  </button>
                </div>
              </div>

              {/* Communication Preference */}
              <div className="space-y-md">
                <div>
                  <label className="font-label-md text-label-md font-bold text-on-surface-variant block mb-xs">
                    Communication Preference
                  </label>
                  <p className="font-body-md text-body-md text-on-surface-variant">What is your ideal working cadence?</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {/* Async First */}
                  <button
                    type="button"
                    onClick={() => setPreferences({ ...preferences, communication: 'Async First' })}
                    className={`flex flex-row items-center gap-md p-md rounded-lg text-left transition-all cursor-pointer ${
                      preferences.communication === 'Async First'
                        ? 'border-2 border-primary bg-primary/5'
                        : 'border border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary">chat</span>
                    </div>
                    <div>
                      <span className="font-title-md text-title-md font-semibold text-on-surface block mb-[2px]">
                        Async First
                      </span>
                      <span className="font-body-md text-body-md text-on-surface-variant">
                        Written updates, flexible hours, fewer meetings.
                      </span>
                    </div>
                  </button>

                  {/* Sync / Meetings */}
                  <button
                    type="button"
                    onClick={() => setPreferences({ ...preferences, communication: 'Sync / Meetings' })}
                    className={`flex flex-row items-center gap-md p-md rounded-lg text-left transition-all cursor-pointer ${
                      preferences.communication === 'Sync / Meetings'
                        ? 'border-2 border-primary bg-primary/5'
                        : 'border border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant">videocam</span>
                    </div>
                    <div>
                      <span className="font-title-md text-title-md font-semibold text-on-surface block mb-[2px]">
                        Sync / Meetings
                      </span>
                      <span className="font-body-md text-body-md text-on-surface-variant">
                        Real-time collaboration, whiteboarding, standups.
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Action Buttons */}
          <div className={`flex items-center ${step === 1 ? 'justify-end' : 'justify-between'} pt-lg border-t border-outline-variant`}>
            {step > 1 && (
              <button
                onClick={handleBack}
                className="px-lg py-sm rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors flex items-center gap-xs cursor-pointer disabled:opacity-70"
            >
              {step === 1 && 'Next: Tech Stack'}
              {step === 2 && 'Next: Experience'}
              {step === 3 && 'Next: Preferences'}
              {step === 4 && (isSubmitting ? 'Completing...' : 'Complete Profile')}
              {!isSubmitting && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
            </button>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-lg hidden lg:block">
          {/* Step 1 & Step 4 Sidebar Header / Brand Moment */}
          {(step === 1 || step === 4) && (
            <>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg overflow-hidden relative min-h-[200px] flex flex-col items-center justify-center text-center">
                <h3 className="font-title-md text-title-md font-semibold z-10">Welcome to the Grid</h3>
                <p className="font-body-md text-body-md text-on-surface-variant z-10 mt-xs">
                  Your profile is your access card to the PolyCollab ecosystem. Make it count.
                </p>
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest to-transparent pointer-events-none"></div>
              </div>

              {/* Quick / Pro Tips */}
              <div className="bg-surface-container-low rounded-lg p-lg">
                <h4 className="font-title-md text-title-md font-semibold mb-sm flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary text-[18px]">lightbulb</span>
                  Pro Tips
                </h4>
                <ul className="space-y-sm">
                  <li className="flex items-start gap-sm">
                    <span className="material-symbols-outlined text-outline mt-[2px] text-[16px]">check_circle</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Keep your bio concise and focused on your current goals.
                    </span>
                  </li>
                  <li className="flex items-start gap-sm">
                    <span className="material-symbols-outlined text-outline mt-[2px] text-[16px]">check_circle</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      Ensure your GitHub links are active; we sync your public repos.
                    </span>
                  </li>
                  <li className="flex items-start gap-sm">
                    <span className="material-symbols-outlined text-outline mt-[2px] text-[16px]">check_circle</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">
                      You can always update this information later from your settings.
                    </span>
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* Step 2 Sidebar (Stack Suggestions & Pro Tip) */}
          {step === 2 && (
            <div className="flex flex-col gap-md">
              <div className="bg-surface border border-outline-variant rounded-lg p-md">
                <h3 className="font-title-md text-title-md font-semibold text-on-surface flex items-center gap-sm mb-sm">
                  <span className="material-symbols-outlined text-primary">lightbulb</span>
                  Stack Suggestions
                </h3>
                <p className="font-label-md text-label-md text-secondary mb-md">
                  Based on '{basicInfo.title || 'Full Stack Developer'}'
                </p>
                <div className="flex flex-col gap-sm">
                  {['Next.js', 'PostgreSQL', 'Docker'].map((item) => (
                    <div key={item} className="flex justify-between items-center group">
                      <span className="font-body-md text-body-md text-on-surface">{item}</span>
                      <button
                        type="button"
                        onClick={() => addSuggestion('frontend', item)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-surface border border-outline-variant text-secondary group-hover:border-primary group-hover:text-primary transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface-container-low border border-primary-fixed-dim rounded-lg p-md relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10">
                  <span className="material-symbols-outlined text-[80px] text-primary">stars</span>
                </div>
                <h3 className="font-title-md text-title-md font-semibold text-primary mb-xs">Pro Tip</h3>
                <p className="font-body-md text-body-md text-on-surface-variant relative z-10">
                  A well-defined tech stack helps our matching engine find projects that need your specific skills.
                </p>
              </div>
            </div>
          )}

          {/* Step 3 Sidebar (Experience Tips & Pro Tip) */}
          {step === 3 && (
            <div className="flex flex-col gap-md">
              <div className="bg-surface border border-outline-variant rounded-lg p-md">
                <h3 className="font-title-md text-title-md font-semibold text-on-surface flex items-center gap-sm mb-sm">
                  <span className="material-symbols-outlined text-primary">info</span>
                  Experience Tips
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Focus on results rather than just tasks. Use metrics like 'Improved performance by 20%' or 'Led a team of 5' to stand out.
                </p>
              </div>

              <div className="bg-surface-container-low border border-primary-fixed-dim rounded-lg p-md relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10">
                  <span className="material-symbols-outlined text-[80px] text-primary">stars</span>
                </div>
                <h3 className="font-title-md text-title-md font-semibold text-primary mb-xs">Pro Tip</h3>
                <p className="font-body-md text-body-md text-on-surface-variant relative z-10">
                  Quantifying your achievements makes your profile 3x more likely to be noticed by top project leads.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
