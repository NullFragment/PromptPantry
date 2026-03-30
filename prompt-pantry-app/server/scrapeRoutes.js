/**
 * Scrape Routes - Proxy endpoint for fetching recipe HTML from external URLs
 */

export function registerScrapeRoutes(app, { middleware }) {
    const { authenticate, requireEditor } = middleware;

    app.get('/api/recipes/scrape', authenticate, requireEditor, async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'url query parameter is required' });
        }

        let parsed;
        try {
            parsed = new URL(url);
        } catch {
            return res.status(400).json({ error: 'Invalid url' });
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return res.status(400).json({ error: 'url must use http or https' });
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; PromptPantry/1.0)',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                redirect: 'follow',
            });

            clearTimeout(timeout);

            if (!response.ok) {
                return res.status(502).json({
                    error: `Failed to fetch page: HTTP ${response.status}`,
                });
            }

            const html = await response.text();
            return res.json({ html, url });
        } catch (err) {
            if (err.name === 'AbortError') {
                return res.status(502).json({ error: 'Failed to fetch page: request timed out' });
            }
            return res.status(502).json({ error: `Failed to fetch page: ${err.message}` });
        }
    });
}
