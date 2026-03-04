interface RecipeJsonEditorProps {
    jsonText: string;
    setJsonText: (text: string) => void;
    jsonError: string | null;
    setJsonError: (err: string | null) => void;
}

export function RecipeJsonEditor({jsonText, setJsonText, jsonError, setJsonError}: RecipeJsonEditorProps) {
    return (
        <div className="space-y-4">
            {jsonError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
                    <span className="font-medium">JSON Error:</span> {jsonError}
                </div>
            )}
            <textarea
                value={jsonText}
                onChange={(e) => {
                    setJsonText(e.target.value);
                    setJsonError(null);
                }}
                className="w-full h-[500px] p-4 font-mono text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-gray-100 resize-y"
                spellCheck={false}
            />
        </div>
    );
}
