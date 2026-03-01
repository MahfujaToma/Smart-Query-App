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
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css" rel="stylesheet">
            <style>
                :root { --bg: #f8f9fa; --card: #ffffff; --text: #212529; }
                @media (prefers-color-scheme: dark) {
                    :root { --bg: #121212; --card: #1e1e1e; --text: #e0e0e0; }
                    .card { background-color: var(--card); color: var(--text); border-color: #333; }
                    .card-header, .card-footer { background-color: rgba(255,255,255,0.05); border-color: #333; }
                    .text-muted { color: #aaa !important; }
                }
                body { background-color: var(--bg); color: var(--text); padding: 2rem 1rem; font-family: system-ui, -apple-system, sans-serif; transition: background 0.3s; }
                .container { max-width: 900px; }
                .query-header { margin-bottom: 2rem; text-align: center; }
                pre[class*="language-"] { border-radius: 0.5rem; margin: 0; max-height: 600px; }
                .btn-copy { transition: all 0.2s; }
                .footer-brand { opacity: 0.7; font-size: 0.9rem; margin-top: 3rem; }
                .badge-sql { background: #0dcaf0; color: #000; font-weight: bold; font-size: 0.7rem; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="query-header">
                    <h2 class="display-6 fw-bold text-info"><i class="bi bi-share-fill me-2"></i>Shared SQL Query</h2>
                    <p class="text-muted">A code snippet shared via Smart Query App</p>
                </div>

                <div class="card shadow-lg border-0 rounded-4 overflow-hidden">
                    <div class="card-header py-3 d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge badge-sql mb-1">SQL</span>
                            <h1 class="card-title h4 mb-0">${query.title}</h1>
                        </div>
                        <button id="copyBtn" class="btn btn-outline-info btn-sm rounded-pill px-3 btn-copy">
                            <i class="bi bi-clipboard me-1"></i> Copy Code
                        </button>
                    </div>
                    <div class="card-body p-0">
                        <pre class="language-sql"><code class="language-sql">${query.query_text}</code></pre>
                    </div>
                    <div class="card-footer py-3 d-flex justify-content-between align-items-center">
                        <small class="text-muted"><i class="bi bi-calendar3 me-1"></i> Shared on ${new Date(query.created_at).toLocaleDateString()}</small>
                        <a href="/" class="btn btn-sm btn-primary rounded-pill">Create Yours</a>
                    </div>
                </div>

                <div class="text-center footer-brand">
                    <p>Powered by <strong>Smart Query App</strong> — Your personal SQL library.</p>
                </div>
            </div>

            <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-sql.min.js"></script>
            <script>
                document.getElementById('copyBtn').addEventListener('click', function() {
                    const code = \`${query.query_text.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
                    navigator.clipboard.writeText(code).then(() => {
                        this.innerHTML = '<i class="bi bi-check2"></i> Copied!';
                        this.classList.replace('btn-outline-info', 'btn-success');
                        setTimeout(() => {
                            this.innerHTML = '<i class="bi bi-clipboard"></i> Copy Code';
                            this.classList.replace('btn-success', 'btn-outline-info');
                        }, 2000);
                    });
                });
            </script>
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
