import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type * as React from 'react';
import {createPortal} from 'react-dom';
import {IngredientDefinition} from '../types';
import {Check, ChevronDown, Link, Loader2, Plus, Search} from 'lucide-react';

interface IngredientAutocompleteProps {
    value: string;
    ingredientId?: string;
    ingredients: IngredientDefinition[];
    storeSections: string[];
    onSelect: (ingredient: string, ingredientId: string) => void;
    onCreateIngredient?: (ingredient: Omit<IngredientDefinition, 'id'>) => Promise<IngredientDefinition | null>;
    onCreateAlias?: (alias: string, ingredientId: string) => Promise<boolean>;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
    /** When true, render dropdown in a portal so it overlays the recipe modal and is not clipped by scroll containers */
    usePortal?: boolean;
}

interface SearchResult {
    ingredient: IngredientDefinition;
    matchedOn: 'name' | 'alias';
    matchedAlias?: string;
    score: number; // Lower is better: 0 = exact, 1 = starts with, 2 = contains
}

type ViewMode = 'search' | 'create' | 'alias';

export function IngredientAutocomplete({
    value,
    ingredientId,
    ingredients,
    storeSections,
    onSelect,
    onCreateIngredient,
    onCreateAlias,
    disabled = false,
    placeholder = 'Start typing ingredient...',
    className = '',
    usePortal = false
}: IngredientAutocompleteProps) {
    const [inputValue, setInputValue] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [viewMode, setViewMode] = useState<ViewMode>('search');
    const [isLoading, setIsLoading] = useState(false);
    
    // Create ingredient form state
    const [newIngredientName, setNewIngredientName] = useState('');
    const [newIngredientSection, setNewIngredientSection] = useState('Unassigned');
    const [newIngredientAlias, setNewIngredientAlias] = useState('');
    const [showSectionDropdown, setShowSectionDropdown] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    
    // Alias selection state
    const [aliasSearchQuery, setAliasSearchQuery] = useState('');
    
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const portalDropdownRef = useRef<HTMLDivElement>(null);
    const sectionDropdownRef = useRef<HTMLDivElement>(null);
    const PORTAL_DROPDOWN_MAX_HEIGHT = 320; // match max-h-80
    const PORTAL_PADDING = 8;
    const PORTAL_GAP = 2;
    const [dropdownPosition, setDropdownPosition] = useState<{
        top?: number;
        bottom?: number;
        left: number;
        width: number;
        maxHeight: number;
        placeAbove: boolean;
    }>({ left: 0, width: 0, maxHeight: PORTAL_DROPDOWN_MAX_HEIGHT, placeAbove: false });

    // Sync input value with prop
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const [portalPositionReady, setPortalPositionReady] = useState(false);

    // Update portal position when dropdown opens; keep on screen and anchored to input
    useEffect(() => {
        if (usePortal && isOpen && inputValue.trim() && inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom - PORTAL_PADDING;
            const spaceAbove = rect.top - PORTAL_PADDING;
            const minHeight = 100;
            // Prefer below if there's enough room; otherwise place above with bottom edge just above input
            const placeBelow = spaceBelow >= minHeight;
            const maxHeight = placeBelow
                ? Math.min(PORTAL_DROPDOWN_MAX_HEIGHT, Math.max(minHeight, spaceBelow))
                : Math.min(PORTAL_DROPDOWN_MAX_HEIGHT, Math.max(minHeight, spaceAbove));
            // When above: anchor by bottom so dropdown shrinks/grows upward (no gap when few rows)
            const bottom = placeBelow ? undefined : (window.innerHeight - (rect.top - PORTAL_GAP));
            const top = placeBelow ? rect.bottom + PORTAL_GAP : undefined;
            const left = Math.max(PORTAL_PADDING, Math.min(rect.left, window.innerWidth - rect.width - PORTAL_PADDING));
            const width = Math.min(rect.width, window.innerWidth - left - PORTAL_PADDING);
            setDropdownPosition({ top, bottom, left, width, maxHeight, placeAbove: !placeBelow });
            setPortalPositionReady(true);
        } else {
            setPortalPositionReady(false);
        }
    }, [usePortal, isOpen, inputValue.trim(), viewMode]);

    // When portal is open, handle Escape/Tab on document so dropdown closes when focus is inside portal
    useEffect(() => {
        if (!usePortal || !isOpen) return;
        const handlePortalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (viewMode !== 'search') {
                    setViewMode('search');
                } else {
                    setIsOpen(false);
                }
                e.preventDefault();
            } else if (e.key === 'Tab') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handlePortalKeyDown, true);
        return () => document.removeEventListener('keydown', handlePortalKeyDown, true);
    }, [usePortal, isOpen, viewMode]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const insideInput = inputRef.current?.contains(target);
            const insideDropdown = usePortal
                ? portalDropdownRef.current?.contains(target)
                : dropdownRef.current?.contains(target);
            if (!insideInput && !insideDropdown) {
                setIsOpen(false);
                setViewMode('search');
            }
            if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(target)) {
                setShowSectionDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [usePortal]);

    // Search and filter ingredients
    const searchResults = useMemo((): SearchResult[] => {
        if (!inputValue.trim()) return [];
        
        const query = inputValue.toLowerCase().trim();
        const results: SearchResult[] = [];
        
        ingredients.forEach(ing => {
            const nameLower = ing.name.toLowerCase();
            
            // Check name match
            if (nameLower === query) {
                results.push({ ingredient: ing, matchedOn: 'name', score: 0 });
            } else if (nameLower.startsWith(query)) {
                results.push({ ingredient: ing, matchedOn: 'name', score: 1 });
            } else if (nameLower.includes(query)) {
                results.push({ ingredient: ing, matchedOn: 'name', score: 2 });
            } else {
                // Check aliases
                const matchedAlias = ing.aliases?.find(alias => {
                    const aliasLower = alias.toLowerCase();
                    return aliasLower === query || aliasLower.startsWith(query) || aliasLower.includes(query);
                });
                
                if (matchedAlias) {
                    const aliasLower = matchedAlias.toLowerCase();
                    let score = 2;
                    if (aliasLower === query) score = 0;
                    else if (aliasLower.startsWith(query)) score = 1;
                    
                    results.push({ ingredient: ing, matchedOn: 'alias', matchedAlias, score });
                }
            }
        });
        
        // Sort by score, then alphabetically
        results.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            return a.ingredient.name.localeCompare(b.ingredient.name);
        });
        
        return results.slice(0, 15);
    }, [inputValue, ingredients]);

    // Check if exact match exists
    const hasExactMatch = useMemo(() => {
        const query = inputValue.toLowerCase().trim();
        return ingredients.some(ing => 
            ing.name.toLowerCase() === query ||
            ing.aliases?.some(a => a.toLowerCase() === query)
        );
    }, [inputValue, ingredients]);

    // Check if current ingredient is linked
    const isLinked = useMemo(() => {
        if (!ingredientId) return false;
        return ingredients.some(ing => ing.id === ingredientId);
    }, [ingredientId, ingredients]);

    // Filtered ingredients for alias selection
    const aliasTargetResults = useMemo(() => {
        if (!aliasSearchQuery.trim()) {
            return ingredients.slice(0, 15);
        }
        const query = aliasSearchQuery.toLowerCase();
        return ingredients
            .filter(ing => ing.name.toLowerCase().includes(query))
            .slice(0, 15);
    }, [aliasSearchQuery, ingredients]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setIsOpen(true);
        setViewMode('search');
        setHighlightedIndex(0);
    };

    const handleSelect = useCallback((result: SearchResult) => {
        const displayName = result.matchedOn === 'alias' && result.matchedAlias 
            ? result.matchedAlias 
            : result.ingredient.name;
        setInputValue(displayName);
        onSelect(displayName, result.ingredient.id);
        setIsOpen(false);
        setViewMode('search');
    }, [onSelect]);

    const handleStartCreate = () => {
        // Parse the input to suggest name and alias
        const trimmed = inputValue.trim();
        if (trimmed.includes(',')) {
            // If comma present, use first part as name, full as alias
            const parts = trimmed.split(',');
            setNewIngredientName(parts[0].trim());
            setNewIngredientAlias(trimmed);
        } else {
            setNewIngredientName(trimmed);
            setNewIngredientAlias('');
        }
        setNewIngredientSection('Unassigned');
        setCreateError(null);
        setViewMode('create');
    };

    const handleCreateIngredient = async () => {
        if (!onCreateIngredient) return;
        
        const name = newIngredientName.trim();
        if (!name) {
            setCreateError('Name is required');
            return;
        }
        
        // Check for conflicts
        const nameLower = name.toLowerCase();
        const conflict = ingredients.find(ing => 
            ing.name.toLowerCase() === nameLower ||
            ing.aliases?.some(a => a.toLowerCase() === nameLower)
        );
        if (conflict) {
            setCreateError(`"${name}" already exists as "${conflict.name}"`);
            return;
        }
        
        setIsLoading(true);
        setCreateError(null);
        
        const aliases: string[] = [];
        if (newIngredientAlias.trim() && newIngredientAlias.trim().toLowerCase() !== nameLower) {
            aliases.push(newIngredientAlias.trim());
        }
        
        try {
            const created = await onCreateIngredient({
                name,
                storeSection: newIngredientSection,
                aliases: aliases.length > 0 ? aliases : undefined
            });
            
            if (created) {
                // Select the newly created ingredient
                const displayName = aliases.length > 0 ? aliases[0] : name;
                setInputValue(displayName);
                onSelect(displayName, created.id);
                setIsOpen(false);
                setViewMode('search');
            } else {
                setCreateError('Failed to create ingredient');
            }
        } catch {
            setCreateError('Failed to create ingredient');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartAlias = () => {
        setAliasSearchQuery('');
        setViewMode('alias');
    };

    const handleCreateAlias = async (targetIngredient: IngredientDefinition) => {
        if (!onCreateAlias) return;
        
        const alias = inputValue.trim();
        if (!alias) return;
        
        setIsLoading(true);
        
        try {
            const success = await onCreateAlias(alias, targetIngredient.id);
            if (success) {
                setInputValue(alias);
                onSelect(alias, targetIngredient.id);
                setIsOpen(false);
                setViewMode('search');
            }
        } catch {
            // Error handled by parent
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }

        if (viewMode !== 'search') {
            if (e.key === 'Escape') {
                setViewMode('search');
                e.preventDefault();
            }
            return;
        }

        const totalItems = searchResults.length + (hasExactMatch ? 0 : 2); // +2 for create options

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => (prev + 1) % totalItems);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => (prev - 1 + totalItems) % totalItems);
                break;
            case 'Enter':
                e.preventDefault();
                if (!hasExactMatch && highlightedIndex === 0) {
                    handleStartCreate();
                } else if (!hasExactMatch && highlightedIndex === 1) {
                    handleStartAlias();
                } else {
                    const resultIndex = hasExactMatch ? highlightedIndex : highlightedIndex - 2;
                    if (searchResults[resultIndex]) {
                        handleSelect(searchResults[resultIndex]);
                    }
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    const handleCancelCreate = () => {
        setViewMode('search');
        setCreateError(null);
    };

    const dropdownClass = 'mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto';
    const portalDropdownClass = 'w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-y-auto';

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder={placeholder}
                    className="w-full p-1.5 pr-8 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {/* Status indicator */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {isLinked ? (
                        <span title="Linked to ingredient">
                            <Link className="h-3.5 w-3.5 text-green-500" />
                        </span>
                    ) : inputValue && !isLinked ? (
                        <Search className="h-3.5 w-3.5 text-gray-400" />
                    ) : null}
                </div>
            </div>

            {/* Dropdown: portaled when usePortal to overlay recipe modal (only after position is computed to avoid flash) */}
            {isOpen && inputValue.trim() && (!usePortal || (portalPositionReady && dropdownPosition.width > 0)) && (() => {
                const content = (
                    <>
                    {viewMode === 'search' && (
                        <>
                            {/* Create new options (only if no exact match) */}
                            {!hasExactMatch && onCreateIngredient && (
                                <button
                                    type="button"
                                    onClick={handleStartCreate}
                                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                                        highlightedIndex === 0 
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                                            : 'text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <Plus className="h-4 w-4" />
                                    Add new ingredient: "{inputValue.trim()}"
                                </button>
                            )}
                            
                            {!hasExactMatch && onCreateAlias && (
                                <button
                                    type="button"
                                    onClick={handleStartAlias}
                                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 ${
                                        highlightedIndex === 1 
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                                            : 'text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <Link className="h-4 w-4" />
                                    Add "{inputValue.trim()}" as alias...
                                </button>
                            )}

                            {/* Search results */}
                            {searchResults.length > 0 ? (
                                searchResults.map((result, idx) => {
                                    const resultIndex = hasExactMatch ? idx : idx + 2;
                                    return (
                                        <button
                                            key={result.ingredient.id}
                                            type="button"
                                            onClick={() => handleSelect(result)}
                                            className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between ${
                                                highlightedIndex === resultIndex
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/30'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                                    {result.ingredient.name}
                                                </span>
                                                {result.matchedOn === 'alias' && result.matchedAlias && (
                                                    <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                                                        (matched: {result.matchedAlias})
                                                    </span>
                                                )}
                                            </div>
                                            <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
                                                {result.ingredient.storeSection}
                                            </span>
                                        </button>
                                    );
                                })
                            ) : (
                                !hasExactMatch && !onCreateIngredient && (
                                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                        No matching ingredients found
                                    </div>
                                )
                            )}
                        </>
                    )}

                    {viewMode === 'create' && (
                        <div className="p-3 space-y-3">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Create New Ingredient
                            </div>
                            
                            {/* Name */}
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={newIngredientName}
                                    onChange={(e) => setNewIngredientName(e.target.value)}
                                    className="w-full p-1.5 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="e.g., garlic"
                                    autoFocus
                                />
                            </div>
                            
                            {/* Store Section */}
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Store Section *</label>
                                <div className="relative" ref={sectionDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowSectionDropdown(!showSectionDropdown)}
                                        className="w-full p-1.5 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-left flex items-center justify-between"
                                    >
                                        <span>{newIngredientSection}</span>
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    </button>
                                    {showSectionDropdown && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-40 overflow-y-auto">
                                            {storeSections.map(section => (
                                                <button
                                                    key={section}
                                                    type="button"
                                                    onClick={() => {
                                                        setNewIngredientSection(section);
                                                        setShowSectionDropdown(false);
                                                    }}
                                                    className={`w-full px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                                        newIngredientSection === section ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
                                                    }`}
                                                >
                                                    {section}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Alias (optional) */}
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Alias (optional)</label>
                                <input
                                    type="text"
                                    value={newIngredientAlias}
                                    onChange={(e) => setNewIngredientAlias(e.target.value)}
                                    className="w-full p-1.5 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="e.g., garlic, minced"
                                />
                            </div>
                            
                            {/* Error */}
                            {createError && (
                                <div className="text-xs text-red-600 dark:text-red-400">
                                    {createError}
                                </div>
                            )}
                            
                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleCreateIngredient}
                                    disabled={isLoading}
                                    className="flex-1 flex items-center justify-center px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4 mr-1" />
                                            Create
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelCreate}
                                    className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {viewMode === 'alias' && (
                        <div className="p-3 space-y-3">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Add "{inputValue.trim()}" as alias of:
                            </div>
                            
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={aliasSearchQuery}
                                    onChange={(e) => setAliasSearchQuery(e.target.value)}
                                    className="w-full pl-8 p-1.5 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Search ingredients..."
                                    autoFocus
                                />
                            </div>
                            
                            {/* Ingredient list */}
                            <div className="max-h-40 overflow-y-auto border dark:border-gray-700 rounded">
                                {aliasTargetResults.map(ing => (
                                    <button
                                        key={ing.id}
                                        type="button"
                                        onClick={() => handleCreateAlias(ing)}
                                        disabled={isLoading}
                                        className="w-full px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between disabled:opacity-50"
                                    >
                                        <span className="text-gray-900 dark:text-gray-100">{ing.name}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{ing.storeSection}</span>
                                    </button>
                                ))}
                                {aliasTargetResults.length === 0 && (
                                    <div className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">
                                        No ingredients found
                                    </div>
                                )}
                            </div>
                            
                            {/* Cancel */}
                            <button
                                type="button"
                                onClick={() => setViewMode('search')}
                                className="w-full px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    </>
                );
                return usePortal
                    ? createPortal(
                        <div
                            ref={portalDropdownRef}
                            style={{
                                position: 'fixed',
                                ...(dropdownPosition.placeAbove
                                    ? { bottom: dropdownPosition.bottom, top: 'auto' as const }
                                    : { top: dropdownPosition.top }),
                                left: dropdownPosition.left,
                                width: dropdownPosition.width,
                                maxHeight: dropdownPosition.maxHeight,
                                zIndex: 60
                            }}
                            className={portalDropdownClass}
                        >
                            {content}
                        </div>,
                        document.body
                    )
                    : <div ref={dropdownRef} className={`absolute z-50 ${dropdownClass}`}>{content}</div>;
            })()}
        </div>
    );
}
