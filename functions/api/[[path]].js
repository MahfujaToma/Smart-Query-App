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

    // --- AI ASSISTANT ---
    if (path.startsWith('ai/') && method === 'POST') {
      const aiAction = path.split('/').pop();
      const { text, query } = await request.json();
      
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Backend Error: env.GEMINI_API_KEY is undefined.' }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const keySnippet = apiKey.trim().substring(0, 6); // Safely show start of key for debugging

      let prompt = "";
      if (aiAction === 'explain') {
        prompt = `Explain this SQL query in plain, concise English:\n\n${query}`;
      } else if (aiAction === 'fix') {
        prompt = `Fix any syntax errors in this SQL query and return ONLY the corrected SQL code. Do not include any explanation or markdown formatting:\n\n${query}`;
      } else if (aiAction === 'generate') {
        prompt = `Generate a valid SQL query based on this description. Return ONLY the SQL code. Do not include any explanation or markdown formatting:\n\n${text}`;
      }

      // Expanded list of models to try
      const models = [
        'gemini-1.5-flash', 
        'gemini-1.5-flash-latest', 
        'gemini-1.5-pro', 
        'gemini-pro',
        'gemini-1.0-pro'
      ];
      let lastError = '';

      for (const model of models) {
        try {
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
          const aiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });

          if (aiResponse.ok) {
            const data = await aiResponse.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
              let result = data.candidates[0].content.parts[0].text.trim();
              if (result.startsWith('```sql')) result = result.replace(/^```sql\n?/, '').replace(/\n?```$/, '');
              if (result.startsWith('```')) result = result.replace(/^```\n?/, '').replace(/\n?```$/, '');
              return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          } 
          
          const errData = await aiResponse.text();
          lastError = `Model ${model} failed (Key starts with ${keySnippet}): ${aiResponse.status} - ${errData}`;
        } catch (e) {
          lastError = `Fetch to ${model} failed: ${e.message}`;
        }
      }

      return new Response(JSON.stringify({ error: `AI Service Error. Details: ${lastError}` }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  } catch (err) {
    return new Response(err.message, { status: 500, headers: corsHeaders });
  }
}
