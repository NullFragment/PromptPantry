import React from 'react';
import {Heart, Minus, Plus, ThumbsDown, ThumbsUp, Trash, X} from 'lucide-react';
import {Ingredient, IngredientDefinition, IngredientGroup, InstructionGroup, Recipe} from '../../types';
import {flattenIngredients, flattenInstructions} from '../../utils/recipeUtils';
import {IngredientAutocomplete} from '../IngredientAutocomplete';

interface IngredientRowProps {
    ing: Ingredient;
    onUpdate: (field: string, value: string) => void;
    onSelect: (name: string, id?: string) => void;
    onDelete: () => void;
    ingredientDefinitions: IngredientDefinition[];
    storeSections: string[];
    onCreateIngredient?: (ingredient: Omit<IngredientDefinition, 'id'>) => Promise<IngredientDefinition | null>;
    onAddIngredientAlias?: (alias: string, ingredientId: string) => Promise<boolean>;
}

const IngredientRow = ({ing, onUpdate, onSelect, onDelete, ingredientDefinitions, storeSections, onCreateIngredient, onAddIngredientAlias}: IngredientRowProps) => (
    <div className="flex gap-2 items-start group">
        <IngredientAutocomplete
            value={ing.ingredient}
            ingredientId={ing.ingredientId}
            ingredients={ingredientDefinitions}
            storeSections={storeSections}
            onSelect={onSelect}
            onCreateIngredient={onCreateIngredient}
            onCreateAlias={onAddIngredientAlias}
            usePortal
            placeholder="Ingredient"
            className="flex-1"
        />
        <input
            type="text"
            className="w-16 p-1.5 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-indigo-500"
            value={ing.quantity || ''}
            onChange={e => onUpdate('quantity', e.target.value)}
            placeholder="Qty"
        />
        <input
            type="text"
            className="w-20 p-1.5 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-indigo-500"
            value={ing.measure || ''}
            onChange={e => onUpdate('measure', e.target.value)}
            placeholder="Unit"
        />
        <button onClick={onDelete} className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors">
            <Trash className="h-4 w-4"/>
        </button>
    </div>
);

interface InstructionRowProps {
    step: string;
    index: number;
    onChange: (value: string) => void;
    onDelete: () => void;
    variant?: 'grouped' | 'flat';
}

const InstructionRow = ({step, index, onChange, onDelete, variant = 'flat'}: InstructionRowProps) => (
    <div className="flex gap-2 items-start">
        <span className={`${variant === 'grouped' ? 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-800'} w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1 dark:text-gray-300`}>
            {index + 1}
        </span>
        <textarea
            className="flex-1 p-2 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            rows={2}
            value={step}
            onChange={e => onChange(e.target.value)}
        />
        <button onClick={onDelete} className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500">
            <Trash className="h-4 w-4"/>
        </button>
    </div>
);

interface MacroInputs {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
}

interface RecipeEditFormProps {
    editedRecipe: Recipe;
    setEditedRecipe: (r: Recipe | ((prev: Recipe) => Recipe)) => void;
    macroInputs: MacroInputs;
    setMacroInputs: (m: MacroInputs | ((prev: MacroInputs) => MacroInputs)) => void;
    servingsInput: string;
    setServingsInput: (s: string) => void;
    tagInput: string;
    setTagInput: (t: string) => void;
    allTags: string[];
    ingredientDefinitions: IngredientDefinition[];
    storeSections: string[];
    onCreateIngredient?: (ingredient: Omit<IngredientDefinition, 'id'>) => Promise<IngredientDefinition | null>;
    onAddIngredientAlias?: (alias: string, ingredientId: string) => Promise<boolean>;
    firstInputRef: React.Ref<HTMLInputElement>;
    handleToggleFavorite: () => void;
    handleSetRating: (rating: 'up' | 'down' | 'neutral') => void;
    /** All recipes (for "Create as variant of" dropdown); only non-variant recipes are offered as base. */
    availableRecipes?: Recipe[];
    /** When user selects a base recipe for a variant, call so modal can sync macro/servings state. */
    onVariantBaseSelected?: (base: Recipe) => void;
}

export function RecipeEditForm({
    editedRecipe,
    setEditedRecipe,
    macroInputs,
    setMacroInputs,
    servingsInput,
    setServingsInput,
    tagInput,
    setTagInput,
    allTags,
    ingredientDefinitions,
    storeSections,
    onCreateIngredient,
    onAddIngredientAlias,
    firstInputRef,
    handleToggleFavorite,
    handleSetRating,
    availableRecipes = [],
    onVariantBaseSelected
}: RecipeEditFormProps) {
    const isVariant = !!editedRecipe.baseRecipeName;
    const baseRecipe = availableRecipes.find(r => r.name === editedRecipe.baseRecipeName);
    const baseIngredients = baseRecipe ? flattenIngredients(baseRecipe.ingredients ?? []) : [];
    const baseInstructions = baseRecipe ? flattenInstructions(baseRecipe.instructions ?? []) : [];
    const baseRecipesForDropdown = availableRecipes.filter(r => !r.baseRecipeName && r.name);
    const isIngredientsGrouped = !isVariant && editedRecipe.ingredients.length > 0 && 'ingredients' in editedRecipe.ingredients[0];
    const isInstructionsGrouped = !isVariant && editedRecipe.instructions.length > 0 && typeof editedRecipe.instructions[0] === 'object' && 'steps' in editedRecipe.instructions[0];
    const variantIngredientAdditions = editedRecipe.ingredientAdditions ?? [];
    const variantInstructionAdditions = editedRecipe.instructionAdditions ?? [];

    const variantName = isVariant && editedRecipe.name.startsWith(editedRecipe.baseRecipeName + ': ')
        ? editedRecipe.name.slice(editedRecipe.baseRecipeName!.length + 2)
        : '';

    const addTag = (tag: string) => {
        const clean = tag.trim();
        if (!clean) return;
        setEditedRecipe(prev => ({
            ...prev,
            tags: Array.from(new Set([...(prev.tags || []), clean]))
        }));
        setTagInput('');
    };

    const removeTag = (tag: string) => {
        setEditedRecipe(prev => ({
            ...prev,
            tags: (prev.tags || []).filter(t => t !== tag)
        }));
    };

    const toggleSuggestedTag = (tag: string) => {
        setEditedRecipe(prev => ({
            ...prev,
            tags: (prev.tags || []).includes(tag)
                ? (prev.tags || []).filter(t => t !== tag)
                : [...(prev.tags || []), tag]
        }));
    };

    const handleAddIngredient = () => {
        const newIng: Ingredient = {ingredient: '', quantity: '', measure: ''};
        if (isIngredientsGrouped) {
            const newIngredients = [...editedRecipe.ingredients] as IngredientGroup[];
            const lastGroupIndex = newIngredients.length - 1;
            if (lastGroupIndex >= 0) {
                newIngredients[lastGroupIndex] = {
                    ...newIngredients[lastGroupIndex],
                    ingredients: [...newIngredients[lastGroupIndex].ingredients, newIng]
                };
            } else {
                newIngredients.push({name: 'Ingredients', ingredients: [newIng]});
            }
            setEditedRecipe({...editedRecipe, ingredients: newIngredients});
        } else {
            setEditedRecipe({
                ...editedRecipe,
                ingredients: [...(editedRecipe.ingredients as Ingredient[]), newIng]
            });
        }
    };

    const handleAddGroup = () => {
        const newGroup: IngredientGroup = {name: '', ingredients: [{ingredient: '', quantity: '', measure: ''}]};
        if (editedRecipe.ingredients.length > 0 && !('ingredients' in editedRecipe.ingredients[0])) {
            const firstGroup: IngredientGroup = {
                name: 'Ingredients',
                ingredients: editedRecipe.ingredients as Ingredient[]
            };
            setEditedRecipe({...editedRecipe, ingredients: [firstGroup, newGroup]});
        } else {
            setEditedRecipe({
                ...editedRecipe,
                ingredients: [...(editedRecipe.ingredients as IngredientGroup[] || []), newGroup]
            });
        }
    };

    const handleAddInstructionStep = () => {
        if (isInstructionsGrouped) {
            const newInstructions = [...editedRecipe.instructions] as InstructionGroup[];
            const lastGroupIndex = newInstructions.length - 1;
            if (lastGroupIndex >= 0) {
                newInstructions[lastGroupIndex] = {
                    ...newInstructions[lastGroupIndex],
                    steps: [...newInstructions[lastGroupIndex].steps, '']
                };
            } else {
                newInstructions.push({name: 'Instructions', steps: ['']});
            }
            setEditedRecipe({...editedRecipe, instructions: newInstructions});
        } else {
            setEditedRecipe({
                ...editedRecipe,
                instructions: [...(editedRecipe.instructions as string[]), '']
            });
        }
    };

    const handleAddInstructionGroup = () => {
        const newGroup: InstructionGroup = {name: '', steps: ['']};
        if (editedRecipe.instructions.length > 0 && typeof editedRecipe.instructions[0] === 'string') {
            const firstGroup: InstructionGroup = {name: 'Instructions', steps: editedRecipe.instructions as string[]};
            setEditedRecipe({...editedRecipe, instructions: [firstGroup, newGroup]});
        } else {
            setEditedRecipe({
                ...editedRecipe,
                instructions: [...(editedRecipe.instructions as InstructionGroup[] || []), newGroup]
            });
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    {!isVariant && editedRecipe.name === '' && baseRecipesForDropdown.length > 0 && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Create as variant of</label>
                            <select
                                className="w-full p-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                value=""
                                onChange={e => {
                                    const baseName = e.target.value;
                                    if (!baseName) return;
                                    const base = baseRecipesForDropdown.find(r => r.name === baseName);
                                    if (base) {
                                        setEditedRecipe({
                                            ...base,
                                            name: base.name + ': ',
                                            baseRecipeName: base.name,
                                            ingredientAdditions: [],
                                            instructionAdditions: [],
                                            ingredients: [],
                                            instructions: []
                                        });
                                        onVariantBaseSelected?.(base);
                                    }
                                }}
                            >
                                <option value="">— New recipe (not a variant) —</option>
                                {baseRecipesForDropdown.map(r => (
                                    <option key={r.name} value={r.name}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                            {isVariant ? 'Variant name' : 'Recipe Name'}
                        </label>
                        {isVariant ? (
                            <div className="flex items-stretch rounded-lg border dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                                <span className="flex items-center px-3 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/80 border-r dark:border-gray-700 shrink-0">
                                    {editedRecipe.baseRecipeName}:
                                </span>
                                <input
                                    ref={firstInputRef}
                                    type="text"
                                    className="flex-1 min-w-0 p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={variantName}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val.includes(':')) return;
                                        setEditedRecipe(prev => ({
                                            ...prev,
                                            name: (prev.baseRecipeName || '') + ': ' + val
                                        }));
                                    }}
                                    placeholder="e.g. Chocolate"
                                />
                            </div>
                        ) : (
                            <input
                                ref={firstInputRef}
                                type="text"
                                className="w-full p-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                value={editedRecipe.name}
                                onChange={e => setEditedRecipe({...editedRecipe, name: e.target.value})}
                                placeholder="e.g. Chicken Shawarma"
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Categories</label>
                        <div className="flex flex-wrap gap-2">
                            {(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Side', 'Drink', 'Misc'] as const).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => {
                                        const cats = editedRecipe.categories.includes(cat)
                                            ? editedRecipe.categories.filter(c => c !== cat)
                                            : [...editedRecipe.categories, cat];
                                        setEditedRecipe({...editedRecipe, categories: cats});
                                    }}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                        editedRecipe.categories.includes(cat)
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Prep Time</label>
                            <input
                                type="text"
                                className="w-full p-2 border dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                value={editedRecipe.prepTime}
                                onChange={e => setEditedRecipe({...editedRecipe, prepTime: e.target.value})}
                                placeholder="e.g. 10 mins"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Cook Time</label>
                            <input
                                type="text"
                                className="w-full p-2 border dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                value={editedRecipe.cookTime}
                                onChange={e => setEditedRecipe({...editedRecipe, cookTime: e.target.value})}
                                placeholder="e.g. 20 mins"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Servings</label>
                            <input
                                type="number"
                                className="w-full p-2 border dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                value={servingsInput}
                                onChange={e => {
                                    setServingsInput(e.target.value);
                                    setEditedRecipe(prev => ({
                                        ...prev,
                                        servings: e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                    }));
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">MFP ID</label>
                            <input
                                type="text"
                                className="w-full p-2 border dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                value={editedRecipe.myFitnessPalId || ''}
                                onChange={e => setEditedRecipe({...editedRecipe, myFitnessPalId: e.target.value})}
                                placeholder="Optional"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Rating & Favorite</label>
                        <div className="flex items-center space-x-4">
                            <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-xl border dark:border-gray-700">
                                <button onClick={() => handleSetRating('up')} className={`p-2 rounded-lg transition-all ${editedRecipe.rating === 'up' ? 'bg-green-500 text-white shadow-md' : 'text-gray-400 hover:text-green-500'}`} title="Thumbs Up">
                                    <ThumbsUp className="h-4 w-4"/>
                                </button>
                                <button onClick={() => handleSetRating('neutral')} className={`p-2 rounded-lg transition-all ${editedRecipe.rating === 'neutral' || !editedRecipe.rating ? 'bg-gray-400 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`} title="Neutral">
                                    <Minus className="h-4 w-4"/>
                                </button>
                                <button onClick={() => handleSetRating('down')} className={`p-2 rounded-lg transition-all ${editedRecipe.rating === 'down' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:text-red-500'}`} title="Thumbs Down">
                                    <ThumbsDown className="h-4 w-4"/>
                                </button>
                            </div>
                            <button
                                onClick={handleToggleFavorite}
                                className={`p-2 rounded-xl border transition-all ${editedRecipe.isFavorite ? 'bg-pink-50 border-pink-200 text-pink-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-pink-500'}`}
                                title={editedRecipe.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                            >
                                <Heart className={`h-5 w-5 ${editedRecipe.isFavorite ? 'fill-current' : ''}`}/>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Video Link</label>
                        <input
                            type="text"
                            className="w-full p-2 border dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            value={editedRecipe.videoLink || ''}
                            onChange={e => setEditedRecipe({...editedRecipe, videoLink: e.target.value})}
                            placeholder="YouTube, Vimeo, or direct video URL"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                        <textarea
                            className="w-full p-2 border dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={3}
                            value={editedRecipe.notes || ''}
                            onChange={e => setEditedRecipe({...editedRecipe, notes: e.target.value})}
                            placeholder="Any additional notes or tips..."
                        />
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Macronutrients (per serving)</h4>
                    <div className="grid grid-cols-2 gap-4">
                        {(['calories', 'protein', 'fat', 'carbs'] as const).map(field => (
                            <div key={field}>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                                    {field === 'calories' ? 'Calories' : `${field.charAt(0).toUpperCase() + field.slice(1)} (g)`}
                                </label>
                                <input
                                    type="number"
                                    className="w-full p-1.5 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    value={macroInputs[field]}
                                    onChange={e => {
                                        const value = e.target.value;
                                        setMacroInputs(prev => ({...prev, [field]: value}));
                                        setEditedRecipe(prev => ({
                                            ...prev,
                                            macros: {
                                                ...prev.macros,
                                                [field]: value === '' ? 0 : parseFloat(value) || 0
                                            }
                                        }));
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">Tags</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 p-1.5 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addTag(tagInput);
                                    }
                                }}
                                placeholder="Add a tag (spaces, commas, hyphens allowed)"
                            />
                            <button
                                type="button"
                                onClick={() => addTag(tagInput)}
                                className="px-3 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                            >
                                Add
                            </button>
                        </div>
                        {allTags.length > 0 && (
                            <div className="mt-2 max-h-20 overflow-y-auto custom-scrollbar" data-testid="suggested-tags">
                                <div className="flex flex-wrap gap-2">
                                    {allTags.map(tag => {
                                        const isSelected = editedRecipe.tags.includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                data-testid={`suggested-tag-${tag.replace(/\s+/g, '-')}`}
                                                onClick={() => toggleSuggestedTag(tag)}
                                                className={`px-2 py-1 rounded-full text-[11px] border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500'}`}
                                            >
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {editedRecipe.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {editedRecipe.tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[11px] rounded-full">
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500">
                                            <X className="h-3 w-3"/>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ingredients</label>
                    {!isVariant && (
                        <div className="flex gap-2">
                            <button onClick={handleAddGroup} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold flex items-center">
                                <Plus className="h-3 w-3 mr-1"/> Add Group
                            </button>
                            <button onClick={handleAddIngredient} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold flex items-center">
                                <Plus className="h-3 w-3 mr-1"/> Add Ingredient
                            </button>
                        </div>
                    )}
                    {isVariant && (
                        <button
                            onClick={() => setEditedRecipe(prev => ({ ...prev, ingredientAdditions: [...(prev.ingredientAdditions ?? []), { ingredient: '', quantity: '', measure: '' }] }))}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold flex items-center"
                        >
                            <Plus className="h-3 w-3 mr-1"/> Add ingredient to Additions
                        </button>
                    )}
                </div>
                <div className="space-y-4 max-h-[40vh] overflow-y-auto border dark:border-gray-700 rounded-lg p-4 transition-colors duration-300">
                    {isVariant ? (
                        <>
                            {baseIngredients.length > 0 && (
                                <div className="space-y-2 p-4 bg-gray-100 dark:bg-gray-800/70 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <h5 className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                                        Base ({editedRecipe.baseRecipeName}) — read-only
                                    </h5>
                                    <ul className="space-y-1.5 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                                        {baseIngredients.map((ing, idx) => (
                                            <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                                                {[ing.quantity, ing.measure].filter(Boolean).join(' ')}
                                                {[ing.quantity, ing.measure].some(Boolean) ? ' ' : ''}
                                                {ing.ingredient}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">Additions</h5>
                                <div className="space-y-2 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                                    {variantIngredientAdditions.map((ing, idx) => (
                                        <IngredientRow
                                            key={idx}
                                            ing={ing}
                                            ingredientDefinitions={ingredientDefinitions}
                                            storeSections={storeSections}
                                            onCreateIngredient={onCreateIngredient}
                                            onAddIngredientAlias={onAddIngredientAlias}
                                            onSelect={(name, id) => {
                                                const next = [...variantIngredientAdditions];
                                                next[idx] = { ...next[idx], ingredient: name, ingredientId: id };
                                                setEditedRecipe(prev => ({ ...prev, ingredientAdditions: next }));
                                            }}
                                            onUpdate={(field, value) => {
                                                const next = [...variantIngredientAdditions];
                                                next[idx] = { ...next[idx], [field]: value };
                                                setEditedRecipe(prev => ({ ...prev, ingredientAdditions: next }));
                                            }}
                                            onDelete={() => {
                                                const next = variantIngredientAdditions.filter((_, i) => i !== idx);
                                                setEditedRecipe(prev => ({ ...prev, ingredientAdditions: next }));
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : isIngredientsGrouped ? (
                        (editedRecipe.ingredients as IngredientGroup[]).map((group, gIdx) => (
                            <div key={gIdx} className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex gap-2 items-center mb-1">
                                    <input
                                        type="text"
                                        className="flex-1 p-2 border dark:border-gray-700 rounded-lg text-xs font-black uppercase tracking-widest bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={group.name}
                                        onChange={e => {
                                            const newIngredients = [...editedRecipe.ingredients] as IngredientGroup[];
                                            newIngredients[gIdx] = {...newIngredients[gIdx], name: e.target.value};
                                            setEditedRecipe({...editedRecipe, ingredients: newIngredients});
                                        }}
                                        placeholder="Group Name (e.g. Dressing)"
                                    />
                                    <button
                                        onClick={() => {
                                            const newIngredients = [...editedRecipe.ingredients] as IngredientGroup[];
                                            newIngredients[gIdx] = {
                                                ...newIngredients[gIdx],
                                                ingredients: [...newIngredients[gIdx].ingredients, {ingredient: '', quantity: '', measure: ''}]
                                            };
                                            setEditedRecipe({...editedRecipe, ingredients: newIngredients});
                                        }}
                                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center hover:text-indigo-800 dark:hover:text-indigo-300"
                                    >
                                        <Plus className="h-3 w-3 mr-1"/> Add Ingredient
                                    </button>
                                    <button
                                        onClick={() => {
                                            const newIngredients = (editedRecipe.ingredients as IngredientGroup[]).filter((_, i) => i !== gIdx);
                                            setEditedRecipe({...editedRecipe, ingredients: newIngredients});
                                        }}
                                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
                                    >
                                        <Trash className="h-4 w-4"/>
                                    </button>
                                </div>
                                <div className="space-y-2 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                                    {group.ingredients.map((ing, iIdx) => (
                                        <IngredientRow
                                            key={iIdx}
                                            ing={ing}
                                            ingredientDefinitions={ingredientDefinitions}
                                            storeSections={storeSections}
                                            onCreateIngredient={onCreateIngredient}
                                            onAddIngredientAlias={onAddIngredientAlias}
                                            onSelect={(name, id) => {
                                                const newIngredients = [...editedRecipe.ingredients] as IngredientGroup[];
                                                const newIngs = [...newIngredients[gIdx].ingredients];
                                                newIngs[iIdx] = {...newIngs[iIdx], ingredient: name, ingredientId: id};
                                                newIngredients[gIdx] = {...newIngredients[gIdx], ingredients: newIngs};
                                                setEditedRecipe({...editedRecipe, ingredients: newIngredients});
                                            }}
                                            onUpdate={(field, value) => {
                                                const newIngredients = [...editedRecipe.ingredients] as IngredientGroup[];
                                                const newIngs = [...newIngredients[gIdx].ingredients];
                                                newIngs[iIdx] = {...newIngs[iIdx], [field]: value};
                                                newIngredients[gIdx] = {...newIngredients[gIdx], ingredients: newIngs};
                                                setEditedRecipe({...editedRecipe, ingredients: newIngredients});
                                            }}
                                            onDelete={() => {
                                                const newIngredients = [...editedRecipe.ingredients] as IngredientGroup[];
                                                const newIngs = newIngredients[gIdx].ingredients.filter((_, i) => i !== iIdx);
                                                newIngredients[gIdx] = {...newIngredients[gIdx], ingredients: newIngs};
                                                setEditedRecipe({...editedRecipe, ingredients: newIngredients});
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="space-y-2">
                            {(editedRecipe.ingredients as Ingredient[]).map((ing, idx) => (
                                <IngredientRow
                                    key={idx}
                                    ing={ing}
                                    ingredientDefinitions={ingredientDefinitions}
                                    storeSections={storeSections}
                                    onCreateIngredient={onCreateIngredient}
                                    onAddIngredientAlias={onAddIngredientAlias}
                                    onSelect={(name, id) => {
                                        const newIngs = [...(editedRecipe.ingredients as Ingredient[])];
                                        newIngs[idx] = {...newIngs[idx], ingredient: name, ingredientId: id};
                                        setEditedRecipe({...editedRecipe, ingredients: newIngs});
                                    }}
                                    onUpdate={(field, value) => {
                                        const newIngs = [...(editedRecipe.ingredients as Ingredient[])];
                                        newIngs[idx] = {...newIngs[idx], [field]: value};
                                        setEditedRecipe({...editedRecipe, ingredients: newIngs});
                                    }}
                                    onDelete={() => {
                                        const newIngs = (editedRecipe.ingredients as Ingredient[]).filter((_, i) => i !== idx);
                                        setEditedRecipe({...editedRecipe, ingredients: newIngs});
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Instructions</label>
                    {!isVariant && (
                        <div className="flex gap-2">
                            <button onClick={handleAddInstructionGroup} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold flex items-center">
                                <Plus className="h-3 w-3 mr-1"/> Add Group
                            </button>
                            <button onClick={handleAddInstructionStep} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold flex items-center">
                                <Plus className="h-3 w-3 mr-1"/> Add Step
                            </button>
                        </div>
                    )}
                    {isVariant && (
                        <button
                            onClick={() => setEditedRecipe(prev => ({ ...prev, instructionAdditions: [...(prev.instructionAdditions ?? []), ''] }))}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold flex items-center"
                        >
                            <Plus className="h-3 w-3 mr-1"/> Add step to Additions
                        </button>
                    )}
                </div>
                <div className="space-y-4">
                    {isVariant ? (
                        <>
                            {baseInstructions.length > 0 && (
                                <div className="space-y-2 p-4 bg-gray-100 dark:bg-gray-800/70 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <h5 className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                                        Base ({editedRecipe.baseRecipeName}) — read-only
                                    </h5>
                                    <ol className="space-y-2 pl-6 list-decimal border-l-2 border-gray-200 dark:border-gray-700">
                                        {baseInstructions.map((step, idx) => (
                                            <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">{step}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                            <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">Additions</h5>
                                <div className="space-y-2 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                                    {variantInstructionAdditions.map((step, idx) => (
                                        <InstructionRow
                                            key={idx}
                                            step={step}
                                            index={idx}
                                            variant="grouped"
                                            onChange={(value) => {
                                                const next = [...variantInstructionAdditions];
                                                next[idx] = value;
                                                setEditedRecipe(prev => ({ ...prev, instructionAdditions: next }));
                                            }}
                                            onDelete={() => {
                                                const next = variantInstructionAdditions.filter((_, i) => i !== idx);
                                                setEditedRecipe(prev => ({ ...prev, instructionAdditions: next }));
                                            }}
                                        />
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setEditedRecipe(prev => ({ ...prev, instructionAdditions: [...(prev.instructionAdditions ?? []), ''] }))}
                                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center mt-2"
                                    >
                                        <Plus className="h-3 w-3 mr-1"/> Add step
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : isInstructionsGrouped ? (
                        (editedRecipe.instructions as InstructionGroup[]).map((group, gIdx) => (
                            <div key={gIdx} className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex gap-2 items-center mb-1">
                                    <input
                                        type="text"
                                        className="flex-1 p-1.5 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={group.name}
                                        onChange={e => {
                                            const newInstructions = [...editedRecipe.instructions] as InstructionGroup[];
                                            newInstructions[gIdx] = {...newInstructions[gIdx], name: e.target.value};
                                            setEditedRecipe({...editedRecipe, instructions: newInstructions});
                                        }}
                                        placeholder="Group Name (e.g. Dressing)"
                                    />
                                    <button
                                        onClick={() => {
                                            const newInstructions = (editedRecipe.instructions as InstructionGroup[]).filter((_, i) => i !== gIdx);
                                            setEditedRecipe({...editedRecipe, instructions: newInstructions});
                                        }}
                                        className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
                                    >
                                        <Trash className="h-4 w-4"/>
                                    </button>
                                </div>
                                <div className="space-y-2 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                                    {group.steps.map((step, sIdx) => (
                                        <InstructionRow
                                            key={sIdx}
                                            step={step}
                                            index={sIdx}
                                            variant="grouped"
                                            onChange={(value) => {
                                                const newInstructions = [...editedRecipe.instructions] as InstructionGroup[];
                                                const newSteps = [...newInstructions[gIdx].steps];
                                                newSteps[sIdx] = value;
                                                newInstructions[gIdx] = {...newInstructions[gIdx], steps: newSteps};
                                                setEditedRecipe({...editedRecipe, instructions: newInstructions});
                                            }}
                                            onDelete={() => {
                                                const newInstructions = [...editedRecipe.instructions] as InstructionGroup[];
                                                const newSteps = newInstructions[gIdx].steps.filter((_, i) => i !== sIdx);
                                                newInstructions[gIdx] = {...newInstructions[gIdx], steps: newSteps};
                                                setEditedRecipe({...editedRecipe, instructions: newInstructions});
                                            }}
                                        />
                                    ))}
                                    <button
                                        onClick={() => {
                                            const newInstructions = [...editedRecipe.instructions] as InstructionGroup[];
                                            newInstructions[gIdx] = {...newInstructions[gIdx], steps: [...newInstructions[gIdx].steps, '']};
                                            setEditedRecipe({...editedRecipe, instructions: newInstructions});
                                        }}
                                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center mt-2 hover:text-indigo-800 dark:hover:text-indigo-300"
                                    >
                                        <Plus className="h-3 w-3 mr-1"/> Add Step to {group.name || 'group'}
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="space-y-2">
                            {(editedRecipe.instructions as string[]).map((step, idx) => (
                                <InstructionRow
                                    key={idx}
                                    step={step}
                                    index={idx}
                                    onChange={(value) => {
                                        const newSteps = [...(editedRecipe.instructions as string[])];
                                        newSteps[idx] = value;
                                        setEditedRecipe({...editedRecipe, instructions: newSteps});
                                    }}
                                    onDelete={() => {
                                        const newSteps = (editedRecipe.instructions as string[]).filter((_, i) => i !== idx);
                                        setEditedRecipe({...editedRecipe, instructions: newSteps});
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
