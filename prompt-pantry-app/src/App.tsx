import {useCallback, useEffect, useMemo, useState} from 'react'
import {IngredientDefinition, Participant, Recipe} from './types'
import {Calendar} from './components/Calendar'
import {RecipeModal} from './components/RecipeModal'
import {ShoppingList} from './components/ShoppingList'
import {WeeklyPlanner} from './components/WeeklyPlanner'
import {Participants} from './components/Participants'
import {ConfirmationDialog} from './components/ConfirmationDialog'
import {Navigation} from './components/Navigation'
import {RecipeView} from './components/RecipeView'
import {Login} from './components/Login'
import {AdminPanel} from './components/AdminPanel'
import {Ingredients} from './components/Ingredients'
import {useRecipes} from './hooks/useRecipes'
import {useParticipants} from './hooks/useParticipants'
import {useMealPlan} from './hooks/useMealPlan'
import {useUIState} from './hooks/useUIState'
import {useRecipeFilters} from './hooks/useRecipeFilters'
import {useIngredients} from './hooks/useIngredients'
import {useStoreSections} from './hooks/useStoreSections'
import {AppProvider} from './contexts/AppContext'
import {useConfirmation} from './hooks/useConfirmation'

function App() {
    const [user, setUser] = useState<string | null>(null);
    const [userTier, setUserTier] = useState<'Viewer' | 'Editor' | 'Admin' | null>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    // Permission flags based on user tier
    const canEdit = userTier === 'Editor' || userTier === 'Admin';
    const canUseAdvancedMode = userTier === 'Admin';

    const {recipes, fetchRecipes, saveRecipe: saveRecipeApi, deleteRecipe: deleteRecipeApi} = useRecipes();
    const {participants, fetchParticipants, saveParticipants: saveParticipantsApi} = useParticipants();
    const {
        ingredients,
        fetchIngredients,
        saveIngredient: saveIngredientApi,
        deleteIngredient: deleteIngredientApi,
        mergeIngredients: mergeIngredientsApi,
        checkUsage: checkIngredientUsage,
        checkAliasUsage,
        updateAlias: updateAliasApi,
        deleteAlias: deleteAliasApi,
        mergeAlias: mergeAliasApi
    } = useIngredients();
    const {
        storeSections,
        fetchStoreSections,
        saveSection,
        deleteSection
    } = useStoreSections();
    const {
        mealPlan,
        setMealPlan,
        multiWeeklyCookPlan,
        setMultiWeeklyCookPlan,
        promptedRecipes,
        setPromptedRecipes,
        updateMealPlanForRecipe
    } = useMealPlan(recipes);
    const {
        view,
        setView,
        searchQuery,
        setSearchQuery,
        unitSystem,
        setUnitSystem,
        viewMode,
        setViewMode,
        advancedMode,
        setAdvancedMode,
        darkMode,
        setDarkMode,
        registrationEnabled,
        toggleRegistration,
        macroLimits,
        setMacroLimits,
        fetchSettings
    } = useUIState(user);
    const {
        allTags,
        allCategories,
        sortedAndFilteredRecipes,
        toggleTag,
        toggleCategory,
        handleSort,
        clearFilters,
        sortConfig,
        selectedTags,
        selectedCategories,
        selectedRatings,
        toggleRating,
        showOnlyFavorites,
        setShowOnlyFavorites,
        showOnlyNeverCooked,
        setShowOnlyNeverCooked
    } = useRecipeFilters(recipes, mealPlan, multiWeeklyCookPlan, searchQuery, setSearchQuery);

    const [selectedRecipeData, setSelectedRecipe] = useState<{
        recipe: Recipe,
        highlightedIngredients?: string[]
    } | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const { confirmation, show: showConfirmation, dismiss: dismissConfirmation } = useConfirmation();

    useEffect(() => {
        if (selectedDate) {
            setCurrentMonth(prev => {
                if (selectedDate.getMonth() !== prev.getMonth() || selectedDate.getFullYear() !== prev.getFullYear()) {
                    return selectedDate;
                }
                return prev;
            });
        }
    }, [selectedDate]);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/me');
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.username);
                    if (data.tier) setUserTier(data.tier);
                } else if (res.status === 401 || res.status === 404) {
                    // Invalid or expired token, or user not found - ensure cookie is cleared
                    await fetch('/api/logout', { method: 'POST' });
                }
            } catch (err) {
                console.error('Auth check failed', err);
            } finally {
                setIsAuthChecking(false);
            }
        };
        if (import.meta.env.MODE === 'test') {
            setUser('testuser');
            setUserTier('Admin');
            setIsAuthChecking(false);
        } else {
            checkAuth();
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchRecipes(advancedMode);
            fetchParticipants();
            fetchIngredients();
            fetchStoreSections();
        }
    }, [user, fetchRecipes, fetchParticipants, fetchIngredients, fetchStoreSections, advancedMode]);

    const handleSaveParticipants = async (updatedParticipants: Participant[], showSuccess = true) => {
        const success = await saveParticipantsApi(updatedParticipants);
        if (success && showSuccess) {
            showConfirmation({
                title: 'Success',
                message: 'Participants saved successfully',
                confirmLabel: 'OK',
                onConfirm: () => dismissConfirmation(),
                onCancel: () => dismissConfirmation()
            });
        }
    };

    const saveRecipe = async (recipe: Recipe, originalName: string | null, keepOpen: boolean = false) => {
        const result = await saveRecipeApi(recipe, originalName === null);
        if (result.success) {
            updateMealPlanForRecipe(recipe.id, recipe);
            if (!keepOpen) {
                setSelectedRecipe(null);
            } else {
                setSelectedRecipe(prev => prev ? {...prev, recipe} : null);
            }
        } else {
            showConfirmation({
                title: 'Error',
                message: result.error || 'Failed to save recipe',
                confirmLabel: 'OK',
                cancelLabel: 'none',
                variant: 'danger',
                onConfirm: () => dismissConfirmation()
            });
        }
    };

    const removeRecipe = async (id: string) => {
        const displayName = recipes.find(r => r.id === id)?.name ?? id;
        showConfirmation({
            title: 'Delete Recipe',
            message: `Are you sure you want to delete "${displayName}"?`,
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                const success = await deleteRecipeApi(id);
                if (success) {
                    updateMealPlanForRecipe(id, null);
                    setSelectedRecipe(null);
                } else {
                    showConfirmation({
                        title: 'Error',
                        message: 'Failed to delete recipe',
                        confirmLabel: 'OK',
                        cancelLabel: 'none',
                        variant: 'danger',
                        onConfirm: () => dismissConfirmation(),
                        onCancel: () => dismissConfirmation()
                    });
                    return;
                }
                dismissConfirmation();
            },
            onCancel: () => dismissConfirmation()
        });
    };

    const removeRecipes = async (ids: string[]) => {
        showConfirmation({
            title: 'Delete Recipes',
            message: `Are you sure you want to delete ${ids.length} recipes?`,
            confirmLabel: 'Delete All',
            variant: 'danger',
            onConfirm: async () => {
                let allSuccess = true;
                for (const id of ids) {
                    const success = await deleteRecipeApi(id);
                    if (success) {
                        updateMealPlanForRecipe(id, null);
                    } else {
                        allSuccess = false;
                    }
                }

                if (!allSuccess) {
                    showConfirmation({
                        title: 'Warning',
                        message: 'Some recipes could not be deleted',
                        confirmLabel: 'OK',
                        cancelLabel: 'none',
                        variant: 'danger',
                        onConfirm: () => dismissConfirmation(),
                        onCancel: () => dismissConfirmation()
                    });
                } else {
                    dismissConfirmation();
                }
                setSelectedRecipe(null);
            },
            onCancel: () => dismissConfirmation()
        });
    };

    // Handler for creating new ingredients from RecipeModal autocomplete
    const handleCreateIngredient = useCallback(async (
        ingredient: Omit<IngredientDefinition, 'id'>
    ): Promise<IngredientDefinition | null> => {
        const result = await saveIngredientApi(ingredient as IngredientDefinition & { name: string; storeSectionId: string }, true);
        if (result.success && result.ingredient) {
            return result.ingredient;
        }
        return null;
    }, [saveIngredientApi]);

    // Handler for adding an alias to an existing ingredient from RecipeModal autocomplete
    const handleAddIngredientAlias = useCallback(async (
        alias: string,
        ingredientId: string
    ): Promise<boolean> => {
        const ingredient = ingredients.find(i => i.id === ingredientId);
        if (!ingredient) return false;

        const updatedIngredient = {
            ...ingredient,
            aliases: [...(ingredient.aliases || []), alias]
        };

        const result = await saveIngredientApi(updatedIngredient, false);
        return result.success;
    }, [ingredients, saveIngredientApi]);

    // Handler for merging ingredients - also refreshes recipes since backend updates them
    const handleMergeIngredients = useCallback(async (
        sourceIds: string[],
        targetId: string
    ) => {
        const result = await mergeIngredientsApi(sourceIds, targetId);
        if (result.success) {
            // Refresh recipes since the backend updates ingredientId references
            await fetchRecipes(advancedMode);
        }
        return result;
    }, [mergeIngredientsApi, fetchRecipes, advancedMode]);

    const wrapAliasHandler = useCallback(<T extends (...args: any[]) => Promise<{ success: boolean; updatedRecipeCount?: number }>>(apiFn: T) => {
        return async (...args: Parameters<T>) => {
            const result = await apiFn(...args);
            if (result.success && (result.updatedRecipeCount ?? 0) > 0) {
                await fetchRecipes(advancedMode);
            }
            return result;
        };
    }, [fetchRecipes, advancedMode]);

    const handleIngredientRecipeClick = (recipeName: string) => {
        const recipe = recipes.find(r => r.name === recipeName);
        if (recipe) {
            setView('recipes');
            setSelectedRecipe({recipe});
        }
    };

    const appContextValue = useMemo(() => ({
        userTier,
        canEdit,
        unitSystem,
        advancedMode: canUseAdvancedMode && advancedMode,
        darkMode
    }), [userTier, canEdit, unitSystem, canUseAdvancedMode, advancedMode, darkMode]);

    if (isAuthChecking) {
        return <div
            className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">Loading...</div>;
    }

    if (!user) {
        return <Login onLogin={(u, tier) => { setUser(u); setUserTier(tier); }} />;
    }

    return (
        <AppProvider value={appContextValue}>
        <div className="app-shell">
            <Navigation
                view={view}
                setView={setView}
                setDarkMode={setDarkMode}
                setUnitSystem={setUnitSystem}
                onLogout={() => { setUser(null); setUserTier(null); }}
            />

            <main className="page-shell">
                {view === 'recipes' && (
                    <RecipeView
                        recipes={recipes}
                        sortedAndFilteredRecipes={sortedAndFilteredRecipes}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        allTags={allTags}
                        selectedTags={selectedTags}
                        toggleTag={toggleTag}
                        allCategories={allCategories}
                        selectedCategories={selectedCategories}
                        toggleCategory={toggleCategory}
                        selectedRatings={selectedRatings}
                        toggleRating={toggleRating}
                        showOnlyFavorites={showOnlyFavorites}
                        setShowOnlyFavorites={setShowOnlyFavorites}
                        showOnlyNeverCooked={showOnlyNeverCooked}
                        setShowOnlyNeverCooked={setShowOnlyNeverCooked}
                        clearFilters={clearFilters}
                        sortConfig={sortConfig}
                        handleSort={handleSort}
                        setSelectedRecipe={setSelectedRecipe}
                        onDeleteRecipes={removeRecipes}
                        mealPlan={mealPlan}
                        multiWeeklyCookPlan={multiWeeklyCookPlan}
                    />
                )}

                {view === 'calendar' && (
                    <Calendar
                        currentMonth={currentMonth}
                        setCurrentMonth={setCurrentMonth}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        mealPlan={mealPlan}
                        setMealPlan={setMealPlan}
                        setMultiWeeklyCookPlan={setMultiWeeklyCookPlan}
                        recipes={recipes}
                        setSelectedRecipe={setSelectedRecipe}
                        participants={participants}
                    />
                )}

                {view === 'weekly' && (
                    <WeeklyPlanner
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        mealPlan={mealPlan}
                        setMealPlan={setMealPlan}
                        recipes={recipes}
                        setSelectedRecipe={setSelectedRecipe}
                        multiWeeklyCookPlan={multiWeeklyCookPlan}
                        setMultiWeeklyCookPlan={setMultiWeeklyCookPlan}
                        promptedRecipes={promptedRecipes}
                        setPromptedRecipes={setPromptedRecipes}
                        participants={participants}
                    />
                )}

                {view === 'shopping' && (
                    <ShoppingList
                        mealPlan={mealPlan}
                        recipes={recipes}
                        participants={participants}
                        multiWeeklyCookPlan={multiWeeklyCookPlan}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        setSelectedRecipe={setSelectedRecipe}
                        ingredients={ingredients}
                        storeSections={storeSections}
                        onSaveSection={saveSection}
                    />
                )}

                {view === 'ingredients' && (
                    <Ingredients
                        ingredients={ingredients}
                        storeSections={storeSections}
                        onSaveSection={saveSection}
                        onDeleteSection={deleteSection}
                        onSave={saveIngredientApi}
                        onDelete={deleteIngredientApi}
                        onCheckUsage={checkIngredientUsage}
                        onMerge={handleMergeIngredients}
                        onRecipeClick={handleIngredientRecipeClick}
                        onCheckAliasUsage={checkAliasUsage}
                        onUpdateAlias={wrapAliasHandler(updateAliasApi)}
                        onDeleteAlias={wrapAliasHandler(deleteAliasApi)}
                        onMergeAlias={wrapAliasHandler(mergeAliasApi)}
                    />
                )}

                {view === 'participants' && (
                    <Participants
                        participants={participants}
                        onSave={handleSaveParticipants}
                        macroLimits={macroLimits}
                    />
                )}

                {view === 'admin' && userTier === 'Admin' && (
                    <AdminPanel
                        registrationEnabled={registrationEnabled}
                        toggleRegistration={toggleRegistration}
                        advancedMode={advancedMode}
                        setAdvancedMode={setAdvancedMode}
                        macroLimits={macroLimits}
                        setMacroLimits={setMacroLimits}
                        fetchSettings={fetchSettings}
                        onEditRecipeFromAudit={(recipeName: string) => {
                            const recipe = recipes.find(r => r.name === recipeName);
                            if (recipe) {
                                setSelectedRecipe({recipe});
                            }
                        }}
                    />
                )}
            </main>

            {selectedRecipeData && (
                <RecipeModal
                    recipe={recipes.find(r => r.name === selectedRecipeData.recipe.name) ?? selectedRecipeData.recipe}
                    recipes={recipes}
                    onClose={() => setSelectedRecipe(null)}
                    onSave={saveRecipe}
                    onDelete={removeRecipe}
                    highlightedIngredients={selectedRecipeData.highlightedIngredients}
                    mealPlan={mealPlan}
                    multiWeeklyCookPlan={multiWeeklyCookPlan}
                    allTags={allTags}
                    ingredientDefinitions={ingredients}
                    storeSections={storeSections}
                    onCreateIngredient={handleCreateIngredient}
                    onAddIngredientAlias={handleAddIngredientAlias}
                />
            )}

            {confirmation && (
                <ConfirmationDialog
                    {...confirmation}
                    onCancel={dismissConfirmation}
                />
            )}
        </div>
        </AppProvider>
    )
}

export default App
