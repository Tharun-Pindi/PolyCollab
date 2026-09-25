import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://accqogzaivaxzueoqjsi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjY3FvZ3phaXZheHp1ZW9xanNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NjA3NDAsImV4cCI6MjEwMzIzNjc0MH0.8EAi9UUGA7ArzZuM-sZjbkfOPBI96QpHdKyavzqnJuI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data: projects, error: pErr } = await supabase.from('projects').select('*');
  console.log('Projects:', projects?.length, pErr ? pErr : '');
  if (projects?.length > 0) {
    console.log(projects.map(p => ({ title: p.title, owner_id: p.owner_id })));
  }

  const { data: profiles, error: prErr } = await supabase.from('profiles').select('*');
  console.log('Profiles:', profiles?.length, prErr ? prErr : '');
  if (profiles?.length > 0) {
    console.log(profiles.map(p => ({ email: p.primary_email, projects: p.projects })));
  }
}

checkDb();
