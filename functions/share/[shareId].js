import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
  const { env, params } = context;
  const shareId = params.shareId;

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

  try {
    const { data: query, error } = await supabase
      .from('shared_queries')
      .select('*')
      .eq('share_id', shareId)
      .single();

    if (error || !query) {
      return new Response('<h1>Not Found</h1><p>The query you are looking for does not exist.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Shared Query: ${query.title}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { background-color: #f8f9fa; padding: 2rem; }
                .container { max-width: 800px; }
                .query-card {
                    word-wrap: break-word;
                    white-space: pre-wrap;
                    background-color: #e9ecef;
                    border-left: 5px solid #0dcaf0;
                    padding: 1rem;
                    border-radius: 0.25rem;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card shadow-sm">
                    <div class="card-header">
                        <h1 class="card-title h3">${query.title}</h1>
                    </div>
                    <div class="card-body">
                        <pre class="query-card"><code>${query.query_text}</code></pre>
                    </div>
                    <div class="card-footer text-muted">
                        Shared at ${new Date(query.created_at).toLocaleString()}
                    </div>
                </div>
                 <div class="mt-3 text-center">
                    <a href="/" class="btn btn-primary">Create your own queries with Smart Query App</a>
                </div>
            </div>
        </body>
        </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    return new Response('<h1>Error</h1><p>An error occurred while loading the shared query.</p>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
