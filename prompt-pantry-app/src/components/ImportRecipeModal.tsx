import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { importRecipeFromHtml, resolveIngredients, type ImportedRecipe } from '../utils/recipeImporter';
import type { IngredientDefinition } from '../types';

interface Props {
    onClose: () => void;
    onImport: (recipe: ImportedRecipe, sourceUrl: string | undefined) => void;
    ingredientLibrary: IngredientDefinition[];
    /** When true, renders inline (no fixed overlay wrapper or title header). */
    inline?: boolean;
}

export function ImportRecipeModal({ onClose, onImport, ingredientLibrary, inline = false }: Props) {
    const [url, setUrl] = useState('');
    const [html, setHtml] = useState('');
    const [showPaste, setShowPaste] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parse = (htmlContent: string, sourceUrl?: string) => {
        try {
            const raw = importRecipeFromHtml(htmlContent, sourceUrl);
            const resolved = resolveIngredients(raw.ingredients, ingredientLibrary);
            onImport({ ...raw, ingredients: resolved }, sourceUrl);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to parse recipe');
        }
    };

    const handleFetch = async () => {
        if (!url.trim()) return;
        setError(null);
        setLoading(true);
        try {
            const res = await fetch(`/api/recipes/scrape?url=${encodeURIComponent(url)}`);
            if (!res.ok) throw new Error('Could not fetch page');
            const { html: fetched } = await res.json() as { html: string };
            parse(fetched, url);
        } catch {
            setShowPaste(true);
        } finally {
            setLoading(false);
        }
    };

    const handlePaste = () => {
        setError(null);
        const urlMatch = html.match(/rel="canonical"\s+href="([^"]+)"|content="(https?:\/\/[^"]+)"\s+property="og:url"/);
        const extractedUrl = urlMatch?.[1] ?? urlMatch?.[2] ?? undefined;
        parse(html, url.trim() || extractedUrl);
    };

    const content = (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Recipe URL</label>
                <div className="flex gap-2">
                    <input
                        type="url"
                        placeholder="https://example.com/recipe"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleFetch()}
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button
                        onClick={handleFetch}
                        disabled={loading || !url.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import'}
                    </button>
                </div>
            </div>

            {showPaste && (
                <div className="space-y-2 pt-2 border-t dark:border-gray-700">
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                        Couldn&apos;t fetch this page automatically — it may block scrapers. Paste the page source below instead.
                    </p>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Page source</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Right-click the recipe card → Inspect → right-click highlighted element → Copy → Copy outerHTML. Or: right-click anywhere → View Page Source → Select All → Copy.
                    </p>
                    <textarea
                        value={html}
                        onChange={e => setHtml(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        placeholder="Paste HTML here..."
                    />
                    <button
                        onClick={handlePaste}
                        disabled={!html.trim()}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                        Parse Recipe
                    </button>
                </div>
            )}

            {!showPaste && (
                <button
                    onClick={() => setShowPaste(true)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
                >
                    Paste HTML instead
                </button>
            )}

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
            )}
        </div>
    );

    if (inline) {
        return content;
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Import Recipe</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                {content}
            </div>
        </div>
    );
}
