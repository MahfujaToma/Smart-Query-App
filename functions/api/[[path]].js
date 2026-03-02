import { createClient } from '@supabase/supabase-js';
import * as jose from 'jose';
import bcrypt from 'bcryptjs';

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = params.path ? params.path.join('/') : '';
  const method = request.method;

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // --- Auth Middleware ---
  const authenticate = async (req) => {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return null;

    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      return payload;
    } catch (err) {
      return null;
    }
  };

  try {
    if (path === 'health') return new Response('OK', { headers: corsHeaders });

    if (path === 'register' && method === 'POST') {
      const { username, password } = await request.json();
      const hashedPassword = await bcrypt.hash(password, 10);
      const { error } = await supabase.from('users').insert([{ username, password: hashedPassword }]);
      if (error) return new Response(error.message, { status: 500, headers: corsHeaders });
      return new Response('User registered', { status: 201, headers: corsHeaders });
    }

    if (path === 'login' && method === 'POST') {
      const { username, password } = await request.json();
      const { data: user } = await supabase.from('users').select('*').eq('username', username).single();
      if (!user) return new Response('User not found', { status: 400, headers: corsHeaders });

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return new Response('Invalid password', { status: 403, headers: corsHeaders });

      const accessToken = await new jose.SignJWT({ id: user.id, username: user.username })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(JWT_SECRET);

      return new Response(JSON.stringify({ accessToken }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const user = await authenticate(request);
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    // --- GET QUERIES ---
    if (path === 'queries' && method === 'GET') {
      const { data } = await supabase.from('queries').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- ADD QUERY ---
    if (path === 'queries' && method === 'POST') {
      const { title, query } = await request.json();
      const { data, error } = await supabase.from('queries').insert([{ user_id: user.id, title, query_text: query }]).select().single();
      await supabase.from('query_history').insert([{ user_id: user.id, title, query_text: query }]);
      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- UPDATE QUERY ---
    if (path.startsWith('queries/update/') && method === 'POST') {
      const id = path.split('/').pop();
      const { title, query } = await request.json();
      const { data } = await supabase.from('queries').update({ title, query_text: query, updated_at: new Date() }).eq('id', id).eq('user_id', user.id).select().single();
      await supabase.from('query_history').insert([{ user_id: user.id, title, query_text: query }]);
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- DELETE QUERY ---
    if (path.startsWith('queries/') && method === 'DELETE') {
      const id = path.split('/').pop();
      const { data: q } = await supabase.from('queries').select('*').eq('id', id).single();
      if (q) await supabase.from('query_history').insert([{ user_id: user.id, title: q.title, query_text: q.query_text }]);
      await supabase.from('queries').delete().eq('id', id).eq('user_id', user.id);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // --- HISTORY ---
    if (path === 'history' && method === 'GET') {
      const { data } = await supabase.from('query_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (path === 'history/all' && method === 'DELETE') {
        await supabase.from('query_history').delete().eq('user_id', user.id);
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    // --- SHARING ---
    if (path.startsWith('queries/share/') && method === 'POST') {
      const queryId = path.split('/').pop();
      const { data: q } = await supabase.from('queries').select('*').eq('id', queryId).single();
      const shareId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { data: shared } = await supabase.from('shared_queries').insert([{ share_id: shareId, title: q.title, query_text: q.query_text, original_user_id: user.id }]).select().single();
      return new Response(JSON.stringify({ shareLink: `${url.origin}/share/${shared.share_id}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- LIVE EXECUTION ---
    if (path === 'execute' && method === 'POST') {
      const { query: sql } = await request.json();
      
      // We use an RPC function named 'exec_sql' which we will create in Supabase
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      return new Response(JSON.stringify({ results: data }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  } catch (err) {
    return new Response(err.message, { status: 500, headers: corsHeaders });
  }
}
