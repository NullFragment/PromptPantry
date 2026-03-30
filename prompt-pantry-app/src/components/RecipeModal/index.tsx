import {useEffect, useMemo, useRef, useState} from 'react';
import {
    AlertTriangle,
    Code2,
    Edit,
    FileEdit,
    Globe,
    Heart,
    Minus,
    Plus,
    Save,
    ThumbsDown,
    ThumbsUp,
    Trash,
    X
} from 'lucide-react';
import {
    IngredientDefinition,
    MealPlan,
    MultiWeeklyCookPlan,
    Recipe,
    ValidationError
} from '../../types';
import {getRecipeCookCount} from '../../utils/mealPlanUtils';
import {resolveVariantRecipe} from '../../utils/recipeUtils';
import {validateRecipe, ValidationError as RecipeValidationError} from '../../utils/recipeValidation';
import {useAppContext} from '../../hooks/useAppContext';
import {RecipeViewMode} from './RecipeViewMode';
import {RecipeEditForm} from './RecipeEditForm';
import {RecipeJsonEditor} from './RecipeJsonEditor';
import {ImportRecipeModal} from '../ImportRecipeModal';

interface RecipeModalProps {
    recipe: Recipe | Record<string, unknown>;
    recipes?: Recipe[];
    onClose: () => void;
    onSave: (recipe: Recipe, originalName: string | null, keepOpen?: boolean) => Promise<void>;
    onSaveRaw?: (recipe: Record<string, unknown>, originalName: string) => Promise<{
        success: boolean;
        error?: string;
        isValid?: boolean;
        errors?: ValidationError[]
    }>;
    onDelete: (name: string) => Promise<void>;
    mealPlan: MealPlan;
    multiWeeklyCookPlan: MultiWeeklyCookPlan;
    highlightedIngredients?: string[];
    isInvalidRecipe?: boolean;
    validationErrors?: ValidationError[];
    allTags?: string[];
    ingredientDefinitions?: IngredientDefinition[];
    storeSections?: string[];
    onCreateIngredient?: (ingredient: Omit<IngredientDefinition, 'id'>) => Promise<IngredientDefinition | null>;
    onAddIngredientAlias?: (alias: string, ingredientId: string) => Promise<boolean>;
}

const headerBtnBase = "p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur hover:bg-white dark:hover:bg-gray-700 rounded-full shadow-sm transition-all h-10 w-10 flex items-center justify-center flex-shrink-0";

function RecipeModalHeader({ isEditing, canEdit, recipe, onDelete, onEdit, onCreateVariant, onClose, onToggleFavorite, onSetRating }: {
    isEditing: boolean;
    canEdit: boolean;
    recipe: Recipe;
    onDelete: () => void;
    onEdit: () => void;
    onCreateVariant?: () => void;
    onClose: () => void;
    onToggleFavorite: () => void;
    onSetRating: (rating: 'up' | 'down' | 'neutral') => void;
}) {
    const isBaseRecipe = !!(recipe.name && !recipe.baseRecipeName);
    return (
        <div className="absolute right-4 top-4 z-10 flex flex-col items-end space-y-2">
            <div className="flex items-center justify-between w-full">
                {!isEditing && canEdit ? (
                    <>
                        {isBaseRecipe && onCreateVariant && (
                            <button onClick={onCreateVariant} className={`${headerBtnBase} text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20`} title="Create variant of this recipe">
                                <Plus className="h-5 w-5"/>
                            </button>
                        )}
                        <button onClick={onDelete} className={`${headerBtnBase} text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400`} title="Delete Recipe">
                            <Trash className="h-5 w-5"/>
                        </button>
                        <button onClick={onEdit} className={`${headerBtnBase} text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400`} title="Edit Recipe">
                            <Edit className="h-5 w-5"/>
                        </button>
                    </>
                ) : <div className="flex-1"></div>}
                <button onClick={onClose} className={`${headerBtnBase} text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300`} aria-label="Close" title="Close Modal">
                    <X className="h-6 w-6"/>
                </button>
            </div>

            {!isEditing && canEdit && (
                <div className="flex items-center justify-between gap-2 w-full">
                    <button
                        onClick={onToggleFavorite}
                        className={`p-2 backdrop-blur hover:bg-white dark:hover:bg-gray-700 rounded-full shadow-sm transition-all h-10 w-10 flex items-center justify-center flex-shrink-0 ${recipe.isFavorite ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-white/80 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500 hover:text-pink-500'}`}
                        title={recipe.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    >
                        <Heart className={`h-5 w-5 ${recipe.isFavorite ? 'fill-current' : ''}`}/>
                    </button>
                    <div className="flex bg-white/80 dark:bg-gray-800/80 backdrop-blur p-1 rounded-full shadow-sm h-10 items-center">
                        <button onClick={() => onSetRating('up')} className={`p-1 rounded-full transition-all h-8 w-8 flex items-center justify-center ${recipe.rating === 'up' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-green-500'}`} title="Thumbs Up">
                            <ThumbsUp className="h-4 w-4"/>
                        </button>
                        <button onClick={() => onSetRating('neutral')} className={`p-1 rounded-full transition-all h-8 w-8 flex items-center justify-center ${recipe.rating === 'neutral' || !recipe.rating ? 'bg-gray-400 text-white shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`} title="Neutral">
                            <Minus className="h-4 w-4"/>
                        </button>
                        <button onClick={() => onSetRating('down')} className={`p-1 rounded-full transition-all h-8 w-8 flex items-center justify-center ${recipe.rating === 'down' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-red-500'}`} title="Thumbs Down">
                            <ThumbsDown className="h-4 w-4"/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function RecipeModal({
    recipe,
    recipes = [],
    onClose,
    onSave,
    onSaveRaw,
    onDelete,
    mealPlan,
    multiWeeklyCookPlan,
    highlightedIngredients,
    isInvalidRecipe,
    validationErrors,
    allTags = [],
    ingredientDefinitions = [],
    storeSections = [],
    onCreateIngredient,
    onAddIngredientAlias
}: RecipeModalProps) {
    const {unitSystem, advancedMode, canEdit} = useAppContext();
    const [isEditing, setIsEditing] = useState(false);
    const [editedRecipe, setEditedRecipe] = useState<Recipe>(recipe as Recipe);
    const [originalName, setOriginalName] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<'form' | 'json' | 'import'>('form');
    const [jsonText, setJsonText] = useState<string>('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [currentValidationErrors, setCurrentValidationErrors] = useState<ValidationError[] | undefined>(validationErrors);
    const [macroInputs, setMacroInputs] = useState<{calories: string; protein: string; carbs: string; fat: string}>(() => ({
        calories: String((recipe as Recipe)?.macros?.calories ?? ''),
        protein: String((recipe as Recipe)?.macros?.protein ?? ''),
        carbs: String((recipe as Recipe)?.macros?.carbs ?? ''),
        fat: String((recipe as Recipe)?.macros?.fat ?? '')
    }));
    const [servingsInput, setServingsInput] = useState<string>(String((recipe as Recipe)?.servings ?? ''));
    const [tagInput, setTagInput] = useState('');
    const [saveErrors, setSaveErrors] = useState<RecipeValidationError[]>([]);
    const [isImported, setIsImported] = useState(false);
    const firstInputRef = useRef<HTMLInputElement | null>(null);

    const recipeName = (recipe as Recipe).name || '';
    const cookCount = useMemo(() => getRecipeCookCount(multiWeeklyCookPlan, mealPlan, recipeName), [multiWeeklyCookPlan, mealPlan, recipeName]);

    useEffect(() => {
        setEditedRecipe(recipe as Recipe);
        const readOnly = !canEdit;
        const shouldEdit = ((recipe as Recipe).name === '' && !readOnly) || isInvalidRecipe;
        setIsEditing(!!shouldEdit);
        const isNewRecipe = (recipe as Recipe).name === '';
        setOriginalName(isNewRecipe ? null : (recipe as Recipe).name);
        setEditMode(isInvalidRecipe ? 'json' : isNewRecipe ? 'import' : 'form');
        setJsonText(JSON.stringify(recipe, null, 2));
        setJsonError(null);
        setCurrentValidationErrors(validationErrors);
        setMacroInputs({
            calories: String((recipe as Recipe)?.macros?.calories ?? ''),
            protein: String((recipe as Recipe)?.macros?.protein ?? ''),
            carbs: String((recipe as Recipe)?.macros?.carbs ?? ''),
            fat: String((recipe as Recipe)?.macros?.fat ?? '')
        });
        setServingsInput(String((recipe as Recipe)?.servings ?? ''));
        setTagInput('');
    }, [recipe, canEdit, isInvalidRecipe, validationErrors]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (isEditing && editMode === 'form') {
            const t = setTimeout(() => firstInputRef.current?.focus(), 0);
            return () => clearTimeout(t);
        }
    }, [isEditing, editMode]);

    const handleSave = async () => {
        if (editMode === 'json') {
            try {
                const parsed = JSON.parse(jsonText);
                if (isInvalidRecipe && onSaveRaw && originalName) {
                    const result = await onSaveRaw(parsed, originalName);
                    if (result.success) {
                        if (result.isValid) {
                            onClose();
                        } else {
                            setCurrentValidationErrors(result.errors);
                        }
                    } else {
                        setJsonError(result.error || 'Failed to save recipe');
                    }
                } else {
                    await onSave(parsed as Recipe, originalName);
                    setIsEditing(false);
                    setEditMode('form');
                }
            } catch (e) {
                setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
            }
        } else {
            const parsedMacros = {
                calories: parseFloat(macroInputs.calories) || 0,
                protein: parseFloat(macroInputs.protein) || 0,
                carbs: parseFloat(macroInputs.carbs) || 0,
                fat: parseFloat(macroInputs.fat) || 0
            };
            const parsedServings = parseInt(servingsInput) || 0;
            const recipeToSave = {
                ...editedRecipe,
                macros: parsedMacros,
                servings: parsedServings
            };
            const validationErrors = validateRecipe(recipeToSave);
            if (validationErrors.length > 0) {
                setSaveErrors(validationErrors);
                return;
            }
            setSaveErrors([]);
            setEditedRecipe(recipeToSave);
            await onSave(recipeToSave, originalName);
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        if (originalName) {
            setEditedRecipe(recipe as Recipe);
            setJsonText(JSON.stringify(recipe, null, 2));
            setJsonError(null);
        }
        if (isInvalidRecipe) {
            onClose();
            return;
        }
        setIsEditing(false);
        setEditMode('form');
        if (!originalName && editedRecipe.name === '') {
            onClose();
        }
    };

    const handleToggleFavorite = async () => {
        const updated = {...editedRecipe, isFavorite: !editedRecipe.isFavorite};
        setEditedRecipe(updated);
        if (!isEditing) {
            await onSave(updated, originalName || updated.name, true);
        }
    };

    const handleSetRating = async (rating: 'up' | 'down' | 'neutral') => {
        const updated = {...editedRecipe, rating};
        setEditedRecipe(updated);
        if (!isEditing) {
            await onSave(updated, originalName || updated.name, true);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity" onClick={onClose}></div>

            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transition-colors duration-300">
                <RecipeModalHeader
                    isEditing={isEditing}
                    canEdit={canEdit}
                    recipe={editedRecipe}
                    onDelete={() => onDelete(editedRecipe.name)}
                    onEdit={() => { setOriginalName(editedRecipe.name); setIsEditing(true); }}
                    onCreateVariant={() => {
                        const base = editedRecipe as Recipe;
                        const variantDraft: Recipe = {
                            ...base,
                            name: base.name + ': ',
                            baseRecipeName: base.name,
                            ingredientAdditions: [],
                            instructionAdditions: [],
                            ingredients: [],
                            instructions: []
                        };
                        setEditedRecipe(variantDraft);
                        setMacroInputs({
                            calories: String(base.macros?.calories ?? ''),
                            protein: String(base.macros?.protein ?? ''),
                            carbs: String(base.macros?.carbs ?? ''),
                            fat: String(base.macros?.fat ?? '')
                        });
                        setServingsInput(String(base.servings ?? ''));
                        setOriginalName(null);
                        setIsEditing(true);
                        setEditMode('form');
                    }}
                    onClose={onClose}
                    onToggleFavorite={handleToggleFavorite}
                    onSetRating={handleSetRating}
                />

                <div className="overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                    {isEditing ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 mb-6 pr-40 flex-wrap">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {isInvalidRecipe ? 'Fix Invalid Recipe' : (originalName ? 'Edit Recipe' : 'Add New Recipe')}
                                </h3>
                                {canEdit && editedRecipe.name && !isInvalidRecipe && (
                                    <button onClick={() => onDelete(editedRecipe.name)} className="p-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 dark:text-red-400 transition-all" title="Delete Recipe">
                                        <Trash className="h-5 w-5"/>
                                    </button>
                                )}
                                {canEdit && !isInvalidRecipe && (
                                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <button
                                            onClick={() => {
                                                if (editMode === 'json') {
                                                    try {
                                                        const parsed = JSON.parse(jsonText);
                                                        setEditedRecipe(parsed as Recipe);
                                                        setJsonError(null);
                                                    } catch (e) {
                                                        setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
                                                        return;
                                                    }
                                                }
                                                setEditMode('form');
                                            }}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${editMode === 'form' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                        >
                                            <FileEdit className="h-4 w-4"/> Form
                                        </button>
                                        <button
                                            onClick={() => setEditMode('import')}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${editMode === 'import' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                        >
                                            <Globe className="h-4 w-4"/> Import
                                        </button>
                                        {advancedMode && (
                                            <button
                                                onClick={() => {
                                                    setJsonText(JSON.stringify(editedRecipe, null, 2));
                                                    setJsonError(null);
                                                    setEditMode('json');
                                                }}
                                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${editMode === 'json' ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                            >
                                                <Code2 className="h-4 w-4"/> JSON
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {currentValidationErrors && currentValidationErrors.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"/>
                                        <div>
                                            <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-2">Validation Errors</h4>
                                            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                                                {currentValidationErrors.map((err, i) => (
                                                    <li key={i} className="font-mono text-xs">
                                                        <span className="font-semibold">{err.path || '/'}</span>: {err.message}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {editMode === 'import' ? (
                                <ImportRecipeModal
                                    inline
                                    onClose={() => setEditMode('form')}
                                    ingredientLibrary={ingredientDefinitions}
                                    onImport={(parsed, _sourceUrl) => {
                                        setEditedRecipe(parsed as unknown as Recipe);
                                        setMacroInputs({
                                            calories: String(parsed.macros?.calories ?? 0),
                                            protein: String(parsed.macros?.protein ?? 0),
                                            carbs: String(parsed.macros?.carbs ?? 0),
                                            fat: String(parsed.macros?.fat ?? 0),
                                        });
                                        setServingsInput(String(parsed.servings ?? 1));
                                        setIsImported(true);
                                        setIsEditing(true);
                                        setEditMode('form');
                                    }}
                                />
                            ) : editMode === 'json' ? (
                                <RecipeJsonEditor
                                    jsonText={jsonText}
                                    setJsonText={setJsonText}
                                    jsonError={jsonError}
                                    setJsonError={setJsonError}
                                />
                            ) : (
                                <RecipeEditForm
                                    editedRecipe={editedRecipe}
                                    setEditedRecipe={(r) => { setSaveErrors([]); setEditedRecipe(r); }}
                                    macroInputs={macroInputs}
                                    setMacroInputs={setMacroInputs}
                                    servingsInput={servingsInput}
                                    setServingsInput={setServingsInput}
                                    tagInput={tagInput}
                                    setTagInput={setTagInput}
                                    allTags={allTags}
                                    ingredientDefinitions={ingredientDefinitions}
                                    storeSections={storeSections}
                                    onCreateIngredient={onCreateIngredient}
                                    onAddIngredientAlias={onAddIngredientAlias}
                                    firstInputRef={firstInputRef}
                                    handleToggleFavorite={handleToggleFavorite}
                                    handleSetRating={handleSetRating}
                                    saveErrors={saveErrors}
                                    availableRecipes={recipes}
                                    isImported={isImported}
                                />
                            )}

                            {editMode !== 'import' && (
                                <div className="flex justify-end space-x-4 pt-6 border-t dark:border-gray-800">
                                    <button onClick={handleCancel} className="px-6 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                                        Cancel
                                    </button>
                                    <button onClick={handleSave} className={`px-8 py-2 rounded-xl text-sm font-bold shadow-md transition-all flex items-center ${editMode === 'json' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                        <Save className="h-4 w-4 mr-2"/> Save Recipe
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <RecipeViewMode
                            recipe={resolveVariantRecipe(editedRecipe as Recipe, recipes)}
                            unitSystem={unitSystem}
                            highlightedIngredients={highlightedIngredients}
                            cookCount={cookCount}
                        />
                    )}
                </div>
            </div>

        </div>
    );
}
