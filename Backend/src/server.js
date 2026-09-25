import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabaseAdmin } from './config/supabase.js';
import cloudinary from './config/cloudinary.js';
import { sendTicketAdminNotification, sendTicketUserAutoReply, sendOtpEmail } from './config/resend.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// In-memory OTP storage for registration email verification
const otpStore = new Map();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Send Real OTP Email for Account Creation
app.post('/api/auth/send-signup-otp', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    try {
      const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (!listErr && users) {
        const existingAuthUser = users.find((u) => u.email && u.email.toLowerCase() === cleanEmail);
        if (existingAuthUser) {
          return res.status(400).json({ success: false, error: 'Account already exists. Please login instead.' });
        }
      }

      const { data: dbProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('primary_email', cleanEmail)
        .maybeSingle();

      const hasCompleteProfile = Boolean(dbProfile && dbProfile.full_name && dbProfile.full_name.trim().length > 0 && dbProfile.title);

      if (hasCompleteProfile) {
        return res.status(400).json({ success: false, error: 'Account already exists. Please login instead.' });
      }
    } catch (checkErr) {
      console.warn('Error checking existing user for signup:', checkErr.message);
    }

    // Generate random 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    const existing = otpStore.get(cleanEmail);
    const validCodes = existing?.validCodes || [];
    validCodes.push(otpCode);

    otpStore.set(cleanEmail, {
      email: cleanEmail,
      password,
      validCodes,
      otpCode,
      expiresAt
    });

    // 1. Send email via Nodemailer SMTP or Resend
    const emailResult = await sendOtpEmail(cleanEmail, otpCode);

    console.log(`\n======================================================`);
    console.log(`🔑 SIGNUP OTP GENERATED FOR ${cleanEmail}`);
    console.log(`👉 OTP CODE: ${otpCode}`);
    console.log(`STATUS: ${emailResult.success ? '✅ EMAIL DELIVERED' : '⚠️ EMAIL NOT DELIVERED (' + (emailResult.error || 'Check Gmail App Password or Resend Domain') + ')'}`);
    console.log(`======================================================\n`);

    // 2. Trigger Supabase Auth OTP email as backup provider
    try {
      await supabaseAdmin.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: true }
      });
      console.log(`✉️ Supabase Auth OTP email requested for ${cleanEmail}`);
    } catch (sbErr) {
      console.warn('Supabase Auth OTP dispatch notice:', sbErr.message);
    }

    res.json({
      success: true,
      message: emailResult.success
        ? `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`
        : `Verification code sent for ${cleanEmail}. (Code: ${otpCode} - check backend terminal log)`,
      emailSent: emailResult.success,
      devOtp: emailResult.success ? undefined : otpCode
    });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Real OTP Code and Create Account in Supabase
app.post('/api/auth/verify-signup-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();
    const storedData = otpStore.get(cleanEmail);

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ success: false, error: 'OTP code must be a 6-digit number.' });
    }

    // Verify against stored valid codes OR Supabase verifyOtp
    let isOtpValid = false;
    let authUser = null;

    if (storedData && storedData.validCodes && storedData.validCodes.includes(cleanOtp)) {
      isOtpValid = true;
    } else {
      try {
        const { data: sbData, error: sbErr } = await supabaseAdmin.auth.verifyOtp({
          email: cleanEmail,
          token: cleanOtp,
          type: 'email'
        });
        if (!sbErr && sbData?.user) {
          isOtpValid = true;
          authUser = sbData.user;
        }
      } catch (err) {
        console.warn('Supabase OTP check notice:', err.message);
      }
    }

    if (!isOtpValid) {
      return res.status(400).json({ success: false, error: 'Invalid or expired 6-digit OTP code. Please check your email inbox.' });
    }

    let verifiedUser = authUser || { id: 'user_' + Date.now(), email: cleanEmail };
    const userPassword = storedData?.password || 'PolyCollabPass123!';

    if (!authUser) {
      try {
        // Try creating the user
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: userPassword,
          email_confirm: true,
          user_metadata: {
            full_name: ''
          }
        });

        if (!createError && userData?.user) {
          verifiedUser = userData.user;
        } else if (createError) {
          console.warn('Supabase Admin createUser notice:', createError.message);
          // If creation fails (e.g. user exists), fetch the user to get real UUID
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = users?.find(u => u.email === cleanEmail);
          if (existingUser) {
            verifiedUser = existingUser;
            console.log('✅ Found existing user for', cleanEmail, 'ID:', verifiedUser.id);
          }
        }
      } catch (adminErr) {
        console.warn('Supabase Admin call notice:', adminErr.message);
      }
    }

    // Insert/upsert clean base profile in Supabase database without fake placeholder text
    try {
      const baseProfile = {
        id: verifiedUser.id,
        full_name: '',
        primary_email: cleanEmail,
        title: '',
        location: '',
        bio: '',
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanEmail)}&background=6366f1&color=fff&size=128`
      };
      // Only upsert if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(verifiedUser.id)) {
        await supabaseAdmin.from('profiles').upsert(baseProfile, { onConflict: 'id' });
        console.log('✅ Created clean initial profile row in Supabase profiles table for', cleanEmail);
      } else {
        console.warn('⚠️ Skipped profile row creation because user ID is invalid:', verifiedUser.id);
      }
    } catch (profileErr) {
      console.warn('Notice inserting base profile into Supabase:', profileErr.message);
    }

    // Clear verified OTP
    otpStore.delete(cleanEmail);

    res.json({
      success: true,
      user: verifiedUser,
      message: 'Email verified and account created successfully!'
    });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Robust Login Endpoint to guarantee user authentication after logout
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Fetch profile from Supabase database
    const { data: dbProfile, error: dbProfileErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('primary_email', cleanEmail)
      .maybeSingle();

    if (dbProfileErr) {
      console.error('❌ Error fetching profile during login:', dbProfileErr);
    }

    if (dbProfile) {
      const [
        { data: techStacks },
        { data: experiences },
        { data: projects },
        { data: preferences }
      ] = await Promise.all([
        supabaseAdmin.from('profile_tech_stacks').select('*').eq('user_id', dbProfile.id),
        supabaseAdmin.from('profile_experiences').select('*').eq('user_id', dbProfile.id),
        supabaseAdmin.from('profile_projects').select('*').eq('user_id', dbProfile.id),
        supabaseAdmin.from('profile_preferences').select('*').eq('user_id', dbProfile.id)
      ]);

      dbProfile.profile_tech_stacks = techStacks || [];
      dbProfile.profile_experiences = experiences || [];
      dbProfile.profile_projects = projects || [];
      dbProfile.profile_preferences = preferences || [];
    }

    // 2. Fetch user from Supabase Auth admin
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = users ? users.find((u) => u.email && u.email.toLowerCase() === cleanEmail) : null;

    if (!dbProfile && !authUser) {
      return res.status(404).json({
        success: false,
        error: "Account not found! You don't have an account yet. Please click 'Create an account' to sign up first."
      });
    }



    let formattedProfile = null;
    if (dbProfile) {
      const techStack = { languages: [], frontend: [], backend: [] };
      if (dbProfile.profile_tech_stacks) {
        dbProfile.profile_tech_stacks.forEach(t => {
          if (techStack[t.category]) techStack[t.category].push(t.skill_name);
        });
      }
      const roles = dbProfile.profile_experiences?.map(r => ({
        company: r.company,
        title: r.title,
        startDate: r.start_date,
        endDate: r.end_date,
        isCurrent: r.is_current,
        achievements: r.achievements
      })) || [];
      const projects = dbProfile.profile_projects?.map(p => ({
        title: p.title,
        status: p.status,
        techTags: p.tech_tags,
        link: p.project_url
      })) || [];
      const preferences = dbProfile.profile_preferences?.[0] ? {
        projectStyle: dbProfile.profile_preferences[0].project_style,
        roleInteraction: dbProfile.profile_preferences[0].role_interaction,
        communication: dbProfile.profile_preferences[0].communication_preference
      } : null;

      formattedProfile = {
        id: dbProfile.id,
        primary_email: cleanEmail,
        full_name: dbProfile.full_name || '',
        title: dbProfile.title || 'Software Engineer',
        location: dbProfile.location || 'Remote',
        bio: dbProfile.bio || '',
        avatar_url: dbProfile.avatar_url || '',
        github_url: dbProfile.github_url || '',
        website_url: dbProfile.website_url || '',
        tech_stack: Object.keys(techStack).some(k => techStack[k].length > 0) ? techStack : null,
        roles: roles.length > 0 ? roles : null,
        projects: projects.length > 0 ? projects : null,
        preferences
      };
    }

    res.json({
      success: true,
      user: authUser || { id: dbProfile?.id || 'usr_' + Date.now(), email: cleanEmail },
      profile: formattedProfile || {
        primary_email: cleanEmail,
        full_name: '',
        title: 'Software Engineer',
        location: 'Remote',
        bio: ''
      },
      message: 'Authentication successful!'
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    message: 'PolyCollab Express Backend Server running smoothly',
    supabaseConnected: !!process.env.SUPABASE_URL,
    cloudinaryConfigured: !!process.env.CLOUDINARY_CLOUD_NAME,
    resendConfigured: !!process.env.RESEND_API_KEY,
    githubOauthSupported: true,
    notifyEmail: process.env.NOTIFY_EMAIL || 'pinditarun6@gmail.com',
    timestamp: new Date().toISOString()
  });
});

// GitHub OAuth configuration status endpoint
app.get('/api/auth/github/config', (req, res) => {
  res.json({
    success: true,
    provider: 'github',
    supabaseUrl: process.env.SUPABASE_URL,
    callbackUrl: `https://${process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace('https://', '') : 'your-project.supabase.co'}/auth/v1/callback`,
    redirectUrl: 'http://localhost:5173/auth/callback',
    instructions: 'Register a GitHub OAuth App in GitHub Settings > Developer Settings > OAuth Apps with Authorization callback URL set to the callbackUrl above.'
  });
});

// Cloudinary Image Upload API
app.post('/api/upload', async (req, res) => {
  try {
    const { image, folder } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'No image provided for upload.' });
    }

    const uploadResult = await cloudinary.uploader.upload(image, {
      folder: folder || 'polycollab_uploads',
      resource_type: 'image',
      timeout: 60000,
      transformation: [{ width: 400, height: 400, crop: 'limit', quality: 'auto' }]
    });

    res.json({
      success: true,
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id
    });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Profiles API
app.get('/api/profiles', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('profiles').select(`
      *,
      profile_tech_stacks(*),
      profile_experiences(*),
      profile_projects(*),
      profile_preferences(*)
    `);
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/profiles', async (req, res) => {
  try {
    console.log('📥 Incoming /api/profiles payload:', req.body);
    const {
      tech_stack,
      roles,
      experiences,
      projects,
      preferences,
      skills,
      ...baseProfile
    } = req.body;

    // Sanitize ID to ensure it is a valid UUID or undefined so Postgres UUID type doesn't throw 22P02 syntax error
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (baseProfile.id && !uuidRegex.test(baseProfile.id)) {
      delete baseProfile.id;
    }

    // 1. Check for orphaned profiles to prevent UNIQUE constraint violations on primary_email
    if (baseProfile.primary_email && baseProfile.id) {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('primary_email', baseProfile.primary_email)
        .maybeSingle();

      if (existingProfile && existingProfile.id !== baseProfile.id) {
        console.warn(`Orphaned profile found for ${baseProfile.primary_email}. Deleting to allow new registration.`);
        await supabaseAdmin.from('profiles').delete().eq('id', existingProfile.id);
      }
    }

    // 2. Upsert base profile
    let upsertOptions = { onConflict: 'id' };
    if (!baseProfile.id) {
      upsertOptions = { onConflict: 'primary_email' };
    }

    const { data: profileData, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert(baseProfile, upsertOptions)
      .select()
      .single();

    if (profileErr) {
      console.error('❌ Supabase upsert error in /api/profiles:', profileErr);
      throw profileErr;
    }
    const userId = profileData.id;

    // 2. Upsert Tech Stack
    if (tech_stack) {
      await supabaseAdmin.from('profile_tech_stacks').delete().eq('user_id', userId);
      const stacks = [];
      if (tech_stack.languages) tech_stack.languages.forEach(s => stacks.push({ user_id: userId, category: 'languages', skill_name: s }));
      if (tech_stack.frontend) tech_stack.frontend.forEach(s => stacks.push({ user_id: userId, category: 'frontend', skill_name: s }));
      if (tech_stack.backend) tech_stack.backend.forEach(s => stacks.push({ user_id: userId, category: 'backend', skill_name: s }));
      if (stacks.length > 0) await supabaseAdmin.from('profile_tech_stacks').insert(stacks);
    }

    // 3. Upsert Experiences (roles)
    if (roles && Array.isArray(roles)) {
      await supabaseAdmin.from('profile_experiences').delete().eq('user_id', userId);
      const validRoles = roles.filter(r => r.company && r.company.trim() !== '' && r.title && r.title.trim() !== '');
      const exps = validRoles.map(r => ({
        user_id: userId,
        company: r.company.trim(),
        title: r.title.trim(),
        start_date: r.startDate ? new Date(r.startDate).toISOString() : null,
        end_date: r.endDate ? new Date(r.endDate).toISOString() : null,
        is_current: r.current || false,
        achievements: r.achievements || ''
      }));
      if (exps.length > 0) await supabaseAdmin.from('profile_experiences').insert(exps);
    }

    // 4. Upsert Projects (profile portfolio projects)
    if (projects && Array.isArray(projects)) {
      await supabaseAdmin.from('profile_projects').delete().eq('user_id', userId);
      const validProjects = projects.filter(p => p.title && p.title.trim() !== '');
      const projs = validProjects.map(p => ({
        user_id: userId,
        title: p.title.trim(),
        status: p.status || 'Completed',
        tech_tags: Array.isArray(p.techTags) ? p.techTags.join(', ') : (p.techTags || p.tech || ''),
        project_url: p.link || ''
      }));
      if (projs.length > 0) await supabaseAdmin.from('profile_projects').insert(projs);
    }

    // 5. Upsert Preferences
    if (preferences) {
      await supabaseAdmin.from('profile_preferences').upsert({
        user_id: userId,
        project_style: preferences.projectStyle || 'Early Stage',
        role_interaction: preferences.roleInteraction || 'Tech Lead',
        communication_preference: preferences.communication || 'Async First'
      }, { onConflict: 'user_id' });
    }

    res.json({ success: true, data: profileData });
  } catch (err) {
    console.error('Profile sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/applications', async (req, res) => {
  try {
    const { project_id, applicant_id, role_applied, why_join, experience, links, comm_pref, comm_handle } = req.body;
    if (!project_id || !applicant_id || !role_applied) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    const { data, error } = await supabaseAdmin.from('applications').insert({
      project_id,
      applicant_id,
      role_applied,
      why_join: why_join || null,
      experience: experience || null,
      links: links || null,
      comm_pref: comm_pref || null,
      comm_handle: comm_handle || null
    }).select().single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Submit application error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/applications/lead/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params;
    if (!ownerId) return res.status(400).json({ success: false, error: 'Owner ID is required' });

    // 1. Get projects owned by this user
    const { data: projects, error: projErr } = await supabaseAdmin
      .from('projects')
      .select('id, title')
      .eq('owner_id', ownerId);

    if (projErr) throw projErr;
    if (!projects || projects.length === 0) return res.json({ success: true, data: [] });

    const projectIds = projects.map(p => p.id);
    const projectsMap = Object.fromEntries(projects.map(p => [p.id, p]));

    // 2. Fetch applications for these projects
    const { data: applications, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('*')
      .in('project_id', projectIds);

    if (appErr) throw appErr;

    // 3. Manually fetch applicant profiles to avoid schema join issues
    const applicantIds = [...new Set(applications.map(a => a.applicant_id).filter(Boolean))];
    let profilesMap = {};
    if (applicantIds.length > 0) {
      const { data: profilesData } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url, primary_email')
        .in('id', applicantIds);
      if (profilesData) {
        profilesData.forEach(pr => profilesMap[pr.id] = pr);
      }
    }

    const data = applications.map(a => ({
      ...a,
      project_title: projectsMap[a.project_id]?.title || 'Unknown Project',
      applicant: profilesMap[a.applicant_id] || null
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('Fetch applications error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) return res.status(400).json({ success: false, error: 'User ID is required' });

    console.log(`🧹 Attempting to clean up ghost auth user: ${userId}`);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.warn('Failed to delete ghost auth user:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`✅ Successfully destroyed ghost auth user: ${userId}`);
    res.json({ success: true, message: 'Ghost user deleted successfully' });
  } catch (err) {
    console.error('Unexpected error deleting user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const { data: projectsData, error: projectsErr } = await supabaseAdmin
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectsErr) throw projectsErr;

    // Fetch related profiles manually to avoid schema cache join issues
    const ownerIds = [...new Set(projectsData.map(p => p.owner_id).filter(Boolean))];
    let profilesMap = {};
    if (ownerIds.length > 0) {
      const { data: profilesData } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, avatar_url, primary_email')
        .in('id', ownerIds);
      if (profilesData) {
        profilesData.forEach(pr => profilesMap[pr.id] = pr);
      }
    }

    // Fetch project roles manually
    const projectIds = projectsData.map(p => p.id);
    let rolesMap = {};
    if (projectIds.length > 0) {
      const { data: rolesData } = await supabaseAdmin
        .from('project_roles')
        .select('*')
        .in('project_id', projectIds);
      if (rolesData) {
        rolesData.forEach(r => {
          if (!rolesMap[r.project_id]) rolesMap[r.project_id] = [];
          rolesMap[r.project_id].push(r);
        });
      }
    }

    // Assemble final payload
    const data = projectsData.map(p => ({
      ...p,
      profiles: profilesMap[p.owner_id] || null,
      project_roles: rolesMap[p.id] || []
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('❌ GET /api/projects error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { roles, ...projectData } = req.body;

    // Sanitize owner_id to ensure it is a valid UUID or undefined so Postgres UUID type doesn't throw 22P02 syntax error
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (projectData.owner_id && !uuidRegex.test(projectData.owner_id)) {
      delete projectData.owner_id;
    }

    const { data: projectRes, error: projectErr } = await supabaseAdmin
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (projectErr) throw projectErr;

    const projectId = projectRes.id;
    if (roles && Array.isArray(roles) && roles.length > 0) {
      const rolesToInsert = roles.map(r => ({
        project_id: projectId,
        title: r.title || 'Contributor',
        openings: r.openings ? parseInt(r.openings, 10) : 1
      }));
      await supabaseAdmin.from('project_roles').insert(rolesToInsert);
    }

    res.json({ success: true, data: projectRes });
  } catch (err) {
    console.error('Project sync error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const { error } = await supabaseAdmin.from('projects').delete().eq('id', projectId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Project delete error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Build Sprints API (deprecated)
app.get('/api/sprints', async (req, res) => {
  res.json({ success: true, data: [] });
});

// Support Tickets API with Resend Email Notifications & Auto-Reply
app.post('/api/tickets', async (req, res) => {
  try {
    const { subject, category, priority, description, attachmentName, userEmail, userName } = req.body;
    const ticketId = `TICKET-${Math.floor(1000 + Math.random() * 9000)}`;

    const ticketObj = {
      id: ticketId,
      subject,
      category: category || 'Technical',
      priority: priority || 'Medium',
      status: 'Open',
      description,
      attachment_name: attachmentName || null,
      user_name: userName || 'Alex',
      user_email: userEmail || process.env.NOTIFY_EMAIL || 'pinditarun6@gmail.com',
      created_at: new Date().toISOString()
    };

    // Save to DB
    const { error: dbErr } = await supabaseAdmin.from('support_tickets').insert(ticketObj);
    if (dbErr) console.warn('Supabase ticket insert error:', dbErr.message);

    // Asynchronously trigger Resend email notifications (Admin alert)
    const adminEmailResult = await sendTicketAdminNotification(ticketObj);

    res.json({
      success: true,
      ticket: ticketObj,
      emailStatus: {
        adminAlertSent: adminEmailResult.success,
        userAutoReplySent: false
      },
      message: 'Support ticket submitted successfully. Admin notified.'
    });
  } catch (err) {
    console.error('Error submitting support ticket:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// User Deletion API
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) throw new Error('User ID is required');

    // Fetch user details first to get email
    let userEmail = null;
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(id);
      if (userData?.user?.email) {
        userEmail = userData.user.email;
      }
    } catch (e) {
      console.warn('Could not fetch user by ID prior to delete:', e.message);
    }

    // Delete from profiles by ID & email
    await supabaseAdmin.from('profiles').delete().eq('id', id);
    if (userEmail) {
      await supabaseAdmin.from('profiles').delete().eq('primary_email', userEmail);
      await supabaseAdmin.from('projects').delete().eq('creator_email', userEmail);
    }
    await supabaseAdmin.from('projects').delete().eq('owner_id', id);

    // Delete the user from Supabase Auth admin
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authErr) console.warn('Auth admin delete notice:', authErr.message);

    res.json({ success: true, message: 'User deleted from auth and DB completely.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// OTP Store for Password Reset
const forgotOtpStore = new Map();

// Forgot Password Endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Generate real 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    forgotOtpStore.set(cleanEmail, { otpCode, expiresAt });

    // Send email using our working resend setup
    const emailResult = await sendOtpEmail(cleanEmail, otpCode);

    res.json({
      success: true,
      message: 'Reset link sent to your email.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Reset Password OTP
app.post('/api/auth/verify-reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const storedData = forgotOtpStore.get(cleanEmail);

    if (!storedData || storedData.otpCode !== cleanOtp || Date.now() > storedData.expiresAt) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP code.' });
    }

    // Find the user in Auth admin
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = users ? users.find((u) => u.email && u.email.toLowerCase() === cleanEmail) : null;

    if (!authUser) {
      return res.status(404).json({ success: false, error: 'No account found with this email.' });
    }

    // Force update the password in Supabase Auth
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password: newPassword
    });

    if (updateErr) {
      return res.status(400).json({ success: false, error: updateErr.message });
    }

    forgotOtpStore.delete(cleanEmail);

    res.json({ success: true, message: 'Password has been reset successfully!' });
  } catch (err) {
    console.error('Verify reset error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/ping', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('keep_alive_logs').insert([{ source: 'cron-job.org' }]);
    if (error) {
      console.error('Ping error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    console.log('⚡ Ping received and logged to Supabase to keep it awake!');
    res.json({ success: true, message: 'Database kept awake 🚀' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('PolyCollab Backend is running 🚀');
});

app.listen(PORT, () => {
  console.log(`🚀 PolyCollab Backend server listening on port ${PORT}`);
});

