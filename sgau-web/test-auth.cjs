/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://flllhvfjdfzlpmhywilt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsbGxodmZqZGZ6bHBtaHl3aWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyODMyMTMsImV4cCI6MjA5Njg1OTIxM30.AmxpbLIw5FJMnu7QkGTujywgjVgh66ctJPOb9nzhVs8';

const CREDENTIALS = {
  admin: { email: 'admin@itri-academy.test', pwd: 'Admin123!' },
  prof:  { email: 'yanlouggani@prof.com', pwd: 'password123' },
  student: { email: 'yanlouggani@gmail.com', pwd: 'password123' },
};

async function testRole(role, creds) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 TEST: ${role.toUpperCase()}`);
  console.log(`${'='.repeat(60)}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Login
  console.log(`\n📌 Login as ${creds.email}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: creds.pwd,
  });
  if (authError) { console.error(`❌ Login failed: ${authError.message}`); return; }
  console.log(`✅ Logged in as ${authData.user?.email}`);

  // 2. Check public.users row
  console.log(`\n📌 Check public.users row...`);
  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('id, email, role, firstname, lastname')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (profileErr) { console.error(`❌ Profile query error: ${profileErr.message}`); return; }
  if (!profile) { console.error(`❌ No public.users row for this user`); return; }
  console.log(`✅ Profile: role=${profile.role}, name=${profile.firstname} ${profile.lastname}`);

  // 3. Test SELECT on various tables
  const tables = ['domains', 'modules', 'groups', 'rooms', 'enrollments', 'weekly_schedule', 'sessions'];
  console.log(`\n📌 SELECT tests:`);
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    const status = error ? `❌ ${error.message.substring(0, 80)}` : `✅ ${(data?.length ?? 0)} rows`;
    console.log(`   ${table.padEnd(18)} ${status}`);
  }

  // 4. Test INSERT + DELETE on rooms (as admin only)
  if (role === 'admin') {
    console.log(`\n📌 CRUD test on rooms...`);
    const testId = crypto.randomUUID();
    const { data: inserted, error: insErr } = await supabase
      .from('rooms')
      .insert({ id: testId, name: 'Test Room', code: 'T-001', capacity: 10, building: 'Test', floor: 0, hasprojector: false, hascomputers: false, isactive: true })
      .select()
      .maybeSingle();
    if (insErr) { console.error(`❌ INSERT failed: ${insErr.message}`); }
    else if (!inserted) { console.error(`❌ INSERT returned no data`); }
    else {
      console.log(`✅ INSERT OK (id=${testId})`);

      const { data: del, error: delErr } = await supabase
        .from('rooms')
        .delete()
        .eq('id', testId)
        .select()
        .maybeSingle();
      if (delErr) { console.error(`❌ DELETE failed: ${delErr.message}`); }
      else if (!del) { console.error(`❌ DELETE returned no data (RLS blocked silently)`); }
      else console.log(`✅ DELETE OK`);
    }

    console.log(`\n📌 UPDATE test on domains...`);
    const { data: firstDomain } = await supabase.from('domains').select('id').limit(1).maybeSingle();
    if (firstDomain) {
      const { error: updErr } = await supabase.from('domains').update({ name: `Updated-${Date.now()}` }).eq('id', firstDomain.id);
      if (updErr) { console.error(`❌ UPDATE failed: ${updErr.message}`); }
      else {
        console.log(`✅ UPDATE OK`);
        await supabase.from('domains').update({ name: 'Langues' }).eq('id', firstDomain.id);
        console.log(`   Restored original name`);
      }
    } else {
      console.warn(`   ⚠ No domains to update`);
    }
  }

  await supabase.auth.signOut();
}

async function main() {
  for (const [role, creds] of Object.entries(CREDENTIALS)) {
    await testRole(role, creds);
  }
  console.log(`\n${'='.repeat(60)}`);
  console.log('🏁 All tests completed');
  console.log(`${'='.repeat(60)}`);
}

main().catch(console.error);
