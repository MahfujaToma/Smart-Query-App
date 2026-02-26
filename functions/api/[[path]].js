import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export async function onRequest(context) {
  const {
    request, // contains the incoming request
    env, // contains environment variables
    params, // contains any parameters from the URL
  } = context;

  const url = new URL(request.url);
  const path = params.path ? params.path.join('/') : '';
  const method = request.method;

  // Initialize Supabase Client
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  const JWT_SECRET = env.JWT_SECRET;

  // Helper for CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Auth Middleware ---
  const authenticate = async (req) => {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return null;

    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return null;
    }
  };

  try {
    // --- HEALTH CHECK ---
    if (path === 'health') {
      return new Response('OK', { headers: corsHeaders });
    }

    // --- REGISTER ---
    if (path === 'register' && method === 'POST') {
      const { username, password } = await request.json();
      if (!username || !password) return new Response('Username and password required', { status: 400, headers: corsHeaders });

      const hashedPassword = await bcrypt.hash(password, 10);
      const { error } = await supabase
        .from('users')
        .insert([{ username, password: hashedPassword }]);

      if (error) {
          if (error.code === '23505') return new Response('Username already exists', { status: 409, headers: corsHeaders });
          return new Response(error.message, { status: 500, headers: corsHeaders });
      }
      return new Response('User registered', { status: 201, headers: corsHeaders });
    }

    // --- LOGIN ---
    if (path === 'login' && method === 'POST') {
      const { username, password } = await request.json();
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !user) return new Response('User not found', { status: 400, headers: corsHeaders });

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return new Response('Invalid password', { status: 403, headers: corsHeaders });

      const accessToken = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
      return new Response(JSON.stringify({ accessToken }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Authenticated Routes
    const user = await authenticate(request);
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    // --- GET QUERIES ---
    if (path === 'queries' && method === 'GET') {
      const { data, error } = await supabase
        .from('queries')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) return new Response(error.message, { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- ADD QUERY ---
    if (path === 'queries' && method === 'POST') {
      const { title, query } = await request.json();
      const { data, error } = await supabase
        .from('queries')
        .insert([{ user_id: user.id, title, query_text: query }])
        .select()
        .single();

      if (error) return new Response(error.message, { status: 500, headers: corsHeaders });

      // Add to history
      await supabase.from('query_history').insert([{ user_id: user.id, title, query_text: query }]);

      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- UPDATE QUERY ---
    if (path.startsWith('queries/update/') && method === 'POST') {
      const id = path.split('/').pop();
      const { title, query } = await request.json();
      const { data, error } = await supabase
        .from('queries')
        .update({ title, query_text: query, updated_at: new Date() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) return new Response(error.message, { status: 500, headers: corsHeaders });
      
      // Add to history
      await supabase.from('query_history').insert([{ user_id: user.id, title, query_text: query }]);

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- DELETE QUERY ---
    if (path.startsWith('queries/') && method === 'DELETE') {
      const id = path.split('/').pop();
      
      // Get the query first to log it to history
      const { data: queryToDelete } = await supabase.from('queries').select('*').eq('id', id).single();
      if (queryToDelete) {
          await supabase.from('query_history').insert([{ user_id: user.id, title: queryToDelete.title, query_text: queryToDelete.query_text }]);
      }

      const { error } = await supabase.from('queries').delete().eq('id', id).eq('user_id', user.id);
      if (error) return new Response(error.message, { status: 500, headers: corsHeaders });
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // --- HISTORY ROUTES ---
    if (path === 'history' && method === 'GET') {
      const { data, error } = await supabase
        .from('query_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) return new Response(error.message, { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (path === 'history/all' && method === 'DELETE') {
      const { error } = await supabase.from('query_history').delete().eq('user_id', user.id);
      if (error) return new Response(error.message, { status: 500, headers: corsHeaders });
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (path.startsWith('history/') && method === 'DELETE') {
      const id = path.split('/').pop();
      const { error } = await supabase.from('query_history').delete().eq('id', id).eq('user_id', user.id);
      if (error) return new Response(error.message, { status: 500, headers: corsHeaders });
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // --- SHARING ---
    if (path.startsWith('queries/share/') && method === 'POST') {
        const queryId = path.split('/').pop();
        const { data: queryToShare } = await supabase.from('queries').select('*').eq('id', queryId).single();
        
        if (!queryToShare) return new Response('Query not found', { status: 404, headers: corsHeaders });

        const shareId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { data: shared, error } = await supabase
            .from('shared_queries')
            .insert([{ share_id: shareId, title: queryToShare.title, query_text: queryToShare.query_text, original_user_id: user.id }])
            .select()
            .single();

        if (error) return new Response(error.message, { status: 500, headers: corsHeaders });

        const shareLink = `${url.origin}/share/${shared.share_id}`;
        return new Response(JSON.stringify({ shareLink }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });

  } catch (err) {
    return new Response(err.message, { status: 500, headers: corsHeaders });
  }
}
