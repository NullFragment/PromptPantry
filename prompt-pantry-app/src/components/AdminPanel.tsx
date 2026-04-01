import React, {useEffect, useRef, useState} from 'react';
import {User, UserTier} from '../types';
import type {MacroLimits} from '../hooks/useUIState';
import {ConfirmationDialog} from './ConfirmationDialog';
import {apiRequest, apiJson} from '../utils/apiRequest';

interface AuditIssue {
    type: 'unlinked' | 'broken_link' | 'missing_measurement' | 'schema_invalid';
    ingredient: string | null;
    detail: string;
}

interface AuditRecipe {
    recipeName: string;
    issues: AuditIssue[];
}

interface AuditSummary {
    totalRecipes: number;
    recipesWithIssues: number;
    totalUnlinked: number;
    totalBrokenLinks: number;
    totalMissingMeasurements: number;
    totalSchemaInvalid: number;
}

interface AuditResult {
    summary: AuditSummary;
    recipes: AuditRecipe[];
}

const ISSUE_LABELS: Record<AuditIssue['type'], { label: string; color: string }> = {
    unlinked: {label: 'Unlinked', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'},
    broken_link: {label: 'Broken Link', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'},
    missing_measurement: {label: 'No Measurement', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'},
    schema_invalid: {label: 'Invalid Schema', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'},
};

interface RecipeAuditSectionProps {
    onEditRecipe: (recipeName: string) => void;
}

const RecipeAuditSection: React.FC<RecipeAuditSectionProps> = ({onEditRecipe}) => {
    const [audit, setAudit] = useState<AuditResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());
    const [filterType, setFilterType] = useState<AuditIssue['type'] | 'all'>('all');

    const runAudit = async () => {
        setLoading(true);
        setError(null);
        const result = await apiRequest<AuditResult>('/api/recipes/audit');
        if (result.success && result.data) {
            setAudit(result.data);
            setExpandedRecipes(new Set());
        } else {
            setError(result.error || 'Failed to run audit');
        }
        setLoading(false);
    };

    const toggleRecipe = (name: string) => {
        setExpandedRecipes(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const filteredRecipes = audit?.recipes.filter(r =>
        filterType === 'all' || r.issues.some(i => i.type === filterType)
    ) ?? [];

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recipe Data Audit</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Identify recipes with unlinked ingredients, missing measurements, and schema issues.</p>
                </div>
                <button
                    onClick={runAudit}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    {loading ? 'Scanning...' : 'Run Audit'}
                </button>
            </div>

            {error && (
                <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-900/50">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {audit && (
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <SummaryCard label="Total Recipes" value={audit.summary.totalRecipes} />
                        <SummaryCard label="With Issues" value={audit.summary.recipesWithIssues} warn={audit.summary.recipesWithIssues > 0} />
                        <SummaryCard label="Unlinked" value={audit.summary.totalUnlinked} warn={audit.summary.totalUnlinked > 0} />
                        <SummaryCard label="Broken Links" value={audit.summary.totalBrokenLinks} warn={audit.summary.totalBrokenLinks > 0} />
                        <SummaryCard label="No Measurement" value={audit.summary.totalMissingMeasurements} warn={audit.summary.totalMissingMeasurements > 0} />
                        <SummaryCard label="Schema Invalid" value={audit.summary.totalSchemaInvalid} warn={audit.summary.totalSchemaInvalid > 0} />
                    </div>

                    {audit.recipes.length > 0 && (
                        <>
                            <div className="flex items-center gap-2 pt-2">
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Filter:</label>
                                <select
                                    value={filterType}
                                    onChange={e => setFilterType(e.target.value as AuditIssue['type'] | 'all')}
                                    className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                                >
                                    <option value="all">All issues ({audit.recipes.length})</option>
                                    <option value="unlinked">Unlinked ({audit.summary.totalUnlinked})</option>
                                    <option value="broken_link">Broken Links ({audit.summary.totalBrokenLinks})</option>
                                    <option value="missing_measurement">Missing Measurements ({audit.summary.totalMissingMeasurements})</option>
                                    <option value="schema_invalid">Schema Invalid ({audit.summary.totalSchemaInvalid})</option>
                                </select>
                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                                    Showing {filteredRecipes.length} of {audit.recipes.length} recipes
                                </span>
                            </div>

                            <div className="border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                                {filteredRecipes.map(r => (
                                    <div key={r.recipeName}>
                                        <div
                                            role="button"
                                            onClick={() => toggleRecipe(r.recipeName)}
                                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                        >
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mr-3">{r.recipeName}</span>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="flex items-center gap-1">
                                                    {Array.from(new Set(r.issues.map(i => i.type))).map(type => (
                                                        <span key={type} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ISSUE_LABELS[type].color}`}>
                                                            {ISSUE_LABELS[type].label}
                                                            <span className="ml-1 opacity-75">({r.issues.filter(i => i.type === type).length})</span>
                                                        </span>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEditRecipe(r.recipeName);
                                                    }}
                                                    className="text-xs px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 border border-indigo-100 dark:border-indigo-800"
                                                    aria-label={`Edit recipe ${r.recipeName}`}
                                                >
                                                    Edit
                                                </button>
                                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedRecipes.has(r.recipeName) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                        {expandedRecipes.has(r.recipeName) && (
                                            <div className="px-4 pb-3 space-y-1">
                                                {r.issues
                                                    .filter(i => filterType === 'all' || i.type === filterType)
                                                    .map((issue, idx) => (
                                                    <div key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 pl-2 border-l-2 border-gray-200 dark:border-gray-600">
                                                        <span className={`shrink-0 px-1.5 py-0.5 rounded font-medium ${ISSUE_LABELS[issue.type].color}`}>
                                                            {ISSUE_LABELS[issue.type].label}
                                                        </span>
                                                        <span>
                                                            {issue.ingredient && <span className="font-medium text-gray-700 dark:text-gray-300">{issue.ingredient}: </span>}
                                                            {issue.detail}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {audit.recipes.length === 0 && (
                        <div className="text-center py-6 text-sm text-green-600 dark:text-green-400 font-medium">
                            All recipes passed the audit — no issues found.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const SummaryCard: React.FC<{ label: string; value: number; warn?: boolean }> = ({label, value, warn}) => (
    <div className={`rounded-lg p-3 text-center ${warn ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'}`}>
        <div className={`text-2xl font-bold ${warn ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'}`}>{value}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
    </div>
);

interface AdminPanelProps {
    registrationEnabled: boolean | null;
    toggleRegistration: () => void;
    advancedMode: boolean;
    setAdvancedMode: (val: boolean) => void;
    macroLimits: MacroLimits;
    setMacroLimits: (limits: MacroLimits) => void;
    fetchSettings: () => Promise<void>;
    onEditRecipeFromAudit: (recipeName: string) => void;
}

interface MacroLimitsSectionProps {
    macroLimits: MacroLimits;
    setMacroLimits: (limits: MacroLimits) => void;
    fetchSettings: () => Promise<void>;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

const MacroLimitsSection: React.FC<MacroLimitsSectionProps> = ({macroLimits, setMacroLimits, fetchSettings}) => {
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [display, setDisplay] = useState(() => ({
        proteinPercentMin: String(macroLimits.proteinPercentMin),
        proteinPercentMax: String(macroLimits.proteinPercentMax),
        fatPercentMin: String(macroLimits.fatPercentMin),
        fatPercentMax: String(macroLimits.fatPercentMax),
        calorieDeficitMax: String(macroLimits.calorieDeficitMax)
    }));

    useEffect(() => {
        setDisplay({
            proteinPercentMin: String(macroLimits.proteinPercentMin),
            proteinPercentMax: String(macroLimits.proteinPercentMax),
            fatPercentMin: String(macroLimits.fatPercentMin),
            fatPercentMax: String(macroLimits.fatPercentMax),
            calorieDeficitMax: String(macroLimits.calorieDeficitMax)
        });
    }, [macroLimits.proteinPercentMin, macroLimits.proteinPercentMax, macroLimits.fatPercentMin, macroLimits.fatPercentMax, macroLimits.calorieDeficitMax]);

    const commitField = (field: keyof MacroLimits, raw: string) => {
        const n = Number(raw.trim());
        const num = (Number.isNaN(n) ? macroLimits[field] : clamp(n)) as number;
        setMacroLimits({...macroLimits, [field]: num});
        setDisplay(prev => ({...prev, [field]: String(num)}));
    };

    const handleSave = async () => {
        const limitsToSave: MacroLimits = {
            proteinPercentMin: clamp(Number(display.proteinPercentMin) || 0),
            proteinPercentMax: clamp(Number(display.proteinPercentMax) || 0),
            fatPercentMin: clamp(Number(display.fatPercentMin) || 0),
            fatPercentMax: clamp(Number(display.fatPercentMax) || 0),
            calorieDeficitMax: clamp(Number(display.calorieDeficitMax) || 0)
        };
        if (limitsToSave.proteinPercentMin > limitsToSave.proteinPercentMax || limitsToSave.fatPercentMin > limitsToSave.fatPercentMax) {
            setMessage('Invalid macro limits: min must be less than or equal to max');
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            const result = await apiJson<{ macroLimits?: MacroLimits }>('/api/settings', 'PUT', {macroLimits: limitsToSave});
            if (result.success && result.data?.macroLimits) {
                setMacroLimits(result.data.macroLimits);
                setDisplay({
                    proteinPercentMin: String(result.data.macroLimits.proteinPercentMin),
                    proteinPercentMax: String(result.data.macroLimits.proteinPercentMax),
                    fatPercentMin: String(result.data.macroLimits.fatPercentMin),
                    fatPercentMax: String(result.data.macroLimits.fatPercentMax),
                    calorieDeficitMax: String(result.data.macroLimits.calorieDeficitMax)
                });
                await fetchSettings();
                setMessage('Macro limits saved.');
            } else {
                setMessage(result.error || 'Failed to save.');
            }
        } catch {
            setMessage('Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 items-end">
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Protein % min</label>
                <input
                    type="number"
                    min={0}
                    max={100}
                    value={display.proteinPercentMin}
                    onChange={(e) => setDisplay(prev => ({...prev, proteinPercentMin: e.target.value}))}
                    onBlur={() => commitField('proteinPercentMin', display.proteinPercentMin)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100 text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Protein % max</label>
                <input
                    type="number"
                    min={0}
                    max={100}
                    value={display.proteinPercentMax}
                    onChange={(e) => setDisplay(prev => ({...prev, proteinPercentMax: e.target.value}))}
                    onBlur={() => commitField('proteinPercentMax', display.proteinPercentMax)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100 text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fat % min</label>
                <input
                    type="number"
                    min={0}
                    max={100}
                    value={display.fatPercentMin}
                    onChange={(e) => setDisplay(prev => ({...prev, fatPercentMin: e.target.value}))}
                    onBlur={() => commitField('fatPercentMin', display.fatPercentMin)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100 text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fat % max</label>
                <input
                    type="number"
                    min={0}
                    max={100}
                    value={display.fatPercentMax}
                    onChange={(e) => setDisplay(prev => ({...prev, fatPercentMax: e.target.value}))}
                    onBlur={() => commitField('fatPercentMax', display.fatPercentMax)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100 text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Calorie deficit % max</label>
                <input
                    type="number"
                    min={0}
                    max={100}
                    value={display.calorieDeficitMax}
                    onChange={(e) => setDisplay(prev => ({...prev, calorieDeficitMax: e.target.value}))}
                    onBlur={() => commitField('calorieDeficitMax', display.calorieDeficitMax)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100 text-sm"
                />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save macro limits'}
                </button>
                {message && <span className="text-sm text-gray-600 dark:text-gray-400">{message}</span>}
            </div>
        </div>
    );
};

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (username: string, password: string, tier: UserTier) => void;
    error: string | null;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({isOpen, onClose, onSave, error}) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [tier, setTier] = useState<UserTier>('Viewer');
    const usernameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const t = setTimeout(() => usernameInputRef.current?.focus(), 0);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(username, password, tier);
    };

    const handleClose = () => {
        setUsername('');
        setPassword('');
        setTier('Viewer');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Create New User</h2>
                <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                    <div>
                        <label htmlFor="new-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Username
                        </label>
                        <input
                            ref={usernameInputRef}
                            id="new-username"
                            type="text"
                            autoComplete="off"
                            data-1p-ignore
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                            required
                            minLength={3}
                        />
                    </div>
                    <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Password
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            autoComplete="off"
                            data-1p-ignore
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                            required
                            minLength={6}
                        />
                    </div>
                    <div>
                        <label htmlFor="new-tier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tier
                        </label>
                        <select
                            id="new-tier"
                            value={tier}
                            onChange={(e) => setTier(e.target.value as UserTier)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                        >
                            <option value="Viewer">Viewer</option>
                            <option value="Editor">Editor</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                        >
                            Create User
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
    registrationEnabled,
    toggleRegistration,
    advancedMode,
    setAdvancedMode,
    macroLimits,
    setMacroLimits,
    fetchSettings,
    onEditRecipeFromAudit
}) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

    const fetchUsers = async () => {
        const result = await apiRequest<User[]>('/api/users');
        if (result.success && result.data) {
            setUsers(result.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (username: string, password: string, tier: UserTier) => {
        setCreateError(null);
        const result = await apiJson<User>('/api/users', 'POST', {username, password, tier});
        if (result.success) {
            setCreateModalOpen(false);
            fetchUsers();
        } else {
            setCreateError(result.error || 'Failed to create user');
        }
    };

    const handleUpdateTier = async (username: string, newTier: UserTier) => {
        setActionError(null);
        const result = await apiJson(`/api/users/${encodeURIComponent(username)}`, 'PUT', {tier: newTier});
        if (result.success) {
            setUsers(prev => prev.map(u => u.username === username ? {...u, tier: newTier} : u));
        } else {
            setActionError(result.error || 'Failed to update user');
        }
    };

    const handleDeleteUser = async (user: User) => {
        setActionError(null);
        const result = await apiJson(`/api/users/${encodeURIComponent(user.username)}`, 'DELETE');
        if (result.success) {
            setUsers(prev => prev.filter(u => u.username !== user.username));
        } else {
            setActionError(result.error || 'Failed to delete user');
        }
        setDeleteConfirm(null);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Settings</h1>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account Registration</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Control whether new users can self-register.</p>
                    </div>
                    <button
                        onClick={toggleRegistration}
                        disabled={registrationEnabled === null}
                        className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm transition-colors ${
                            registrationEnabled ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {registrationEnabled ? 'Disable Registration' : 'Enable Registration'}
                    </button>
                </div>
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Advanced Mode</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Toggle advanced cooking features.</p>
                    </div>
                    <button
                        onClick={() => setAdvancedMode(!advancedMode)}
                        className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm transition-colors ${
                            advancedMode ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {advancedMode ? 'Disable Advanced Mode' : 'Enable Advanced Mode'}
                    </button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Participant macro limits</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Min/max for protein %, fat %, and max calorie deficit % used when editing participants.</p>
                    </div>
                    <MacroLimitsSection
                        macroLimits={macroLimits}
                        setMacroLimits={setMacroLimits}
                        fetchSettings={fetchSettings}
                    />
                </div>
            </div>

            {/* User Management Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">User Management</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage users and their access tiers.</p>
                    </div>
                    <button
                        onClick={() => {
                            setCreateError(null);
                            setCreateModalOpen(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        Add User
                    </button>
                </div>
                {actionError && (
                    <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-900/50">
                        <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
                    </div>
                )}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading users...</div>
                    ) : users.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">No users found</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr key="header">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Username
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Tier
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {users.map((user) => (
                                    <tr key={user.username}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            {user.username}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <select
                                                value={user.tier}
                                                onChange={(e) => handleUpdateTier(user.username, e.target.value as UserTier)}
                                                aria-label={`Change tier for ${user.username}`}
                                                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                                            >
                                                <option value="Viewer">Viewer</option>
                                                <option value="Editor">Editor</option>
                                                <option value="Admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <button
                                                onClick={() => setDeleteConfirm(user)}
                                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <RecipeAuditSection onEditRecipe={onEditRecipeFromAudit} />

            <CreateUserModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSave={handleCreateUser}
                error={createError}
            />

            {deleteConfirm && (
                <ConfirmationDialog
                    title="Delete User"
                    message={`Are you sure you want to delete user "${deleteConfirm.username}"?`}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    variant="danger"
                    onConfirm={() => handleDeleteUser(deleteConfirm)}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}
        </div>
    );
};

