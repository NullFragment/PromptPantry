import {useCallback, useEffect, useRef, useState} from 'react';
import {CompactMealPlan, MealPlan, MultiWeeklyCookPlan, Recipe} from '../types';
import {ALL_MEAL_TYPES, dehydrateMealPlan, hydrateMealPlan, isCompactMealPlan} from '../utils/mealPlanUtils';
import {apiRequest, apiJson} from '../utils/apiRequest';

const API_BASE = '/api';
const emptyPlan: MealPlan = {};

async function fetchJsonFallback<T>(url: string, fallback: T): Promise<T> {
    const result = await apiRequest<T>(url);
    return result.success && result.data !== undefined ? result.data : fallback;
}

async function putJsonSafe(url: string, payload: unknown): Promise<{ success: boolean; error?: string }> {
    const result = await apiJson(url, 'PUT', payload);
    if (!result.success) {
        console.error(`Failed to sync ${url}:`, result.error);
    }
    return result;
}

const hasEntries = (obj: Record<string, unknown> | undefined | null) => !!obj && Object.keys(obj).length > 0;

export function useMealPlan(recipes: Recipe[] = []) {
    // Start with empty state - will hydrate from localStorage/server when recipes are available
    const [mealPlan, setMealPlan] = useState<MealPlan>(emptyPlan);

    const [multiWeeklyCookPlan, setMultiWeeklyCookPlan] = useState<MultiWeeklyCookPlan>(() => {
        const saved = localStorage.getItem('multiWeeklyCookPlan');
        if (!saved) return {};
        try {
            const parsed = JSON.parse(saved);
            return parsed && typeof parsed === 'object' ? parsed as MultiWeeklyCookPlan : {};
        } catch (e) {
            console.error('Failed to parse localStorage multiWeeklyCookPlan', e);
            return {};
        }
    });

    const [promptedRecipes, setPromptedRecipes] = useState<Record<string, string[]>>({});
    const [hydrated, setHydrated] = useState(false);
    const [recipesLoaded, setRecipesLoaded] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    // Track when recipes are available for hydration
    useEffect(() => {
        if (recipes.length > 0 && !recipesLoaded) {
            setRecipesLoaded(true);
        }
    }, [recipes, recipesLoaded]);

    useEffect(() => {
        // Wait for recipes to be loaded before hydrating meal plan
        if (!recipesLoaded) return;

        let cancelled = false;
        const load = async () => {
            const [remoteMealPlanRaw, remoteMultiRaw] = await Promise.all([
                fetchJsonFallback<CompactMealPlan>(`${API_BASE}/meal-plan`, {}),
                fetchJsonFallback<MultiWeeklyCookPlan>(`${API_BASE}/multi-weekly-cook-plan`, multiWeeklyCookPlan)
            ]);

            if (cancelled) return;

            // Try to load from localStorage if server is empty
            let mealPlanSource = remoteMealPlanRaw;
            if (!hasEntries(remoteMealPlanRaw)) {
                const saved = localStorage.getItem('mealPlan');
                if (saved) {
                    try {
                        mealPlanSource = JSON.parse(saved);
                    } catch (e) {
                        console.error('Failed to parse localStorage mealPlan', e);
                    }
                }
            }

            // Hydrate compact meal plan storage format into full in-memory plan
            const compactPlan =
                hasEntries(mealPlanSource) && isCompactMealPlan(mealPlanSource)
                    ? (mealPlanSource as CompactMealPlan)
                    : {};
            const remoteMealPlan: MealPlan = hydrateMealPlan(compactPlan, recipes);

            const remoteMulti = remoteMultiRaw;

            // Seed server if local data exists but server was empty
            if (!hasEntries(remoteMealPlanRaw) && hasEntries(remoteMealPlan)) {
                const compact = dehydrateMealPlan(remoteMealPlan);
                void putJsonSafe(`${API_BASE}/meal-plan`, compact);
            }

            setMealPlan(remoteMealPlan);

            setMultiWeeklyCookPlan(prev => {
                if (hasEntries(remoteMulti)) return remoteMulti;
                if (hasEntries(prev)) {
                    void putJsonSafe(`${API_BASE}/multi-weekly-cook-plan`, prev);
                    return prev;
                }
                return remoteMulti;
            });

            setHydrated(true);
        };

        load();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recipesLoaded]);

    const mealPlanServerTimer = useRef<ReturnType<typeof setTimeout>>();
    const multiWeekServerTimer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (!hydrated) return;
        const compact = dehydrateMealPlan(mealPlan);
        localStorage.setItem('mealPlan', JSON.stringify(compact));
        clearTimeout(mealPlanServerTimer.current);
        mealPlanServerTimer.current = setTimeout(async () => {
            const result = await putJsonSafe(`${API_BASE}/meal-plan`, compact);
            if (result.success) setSyncError(null);
            else setSyncError(result.error ?? 'Failed to sync meal plan');
        }, 500);
        return () => clearTimeout(mealPlanServerTimer.current);
    }, [mealPlan, hydrated]);

    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem('multiWeeklyCookPlan', JSON.stringify(multiWeeklyCookPlan));
        clearTimeout(multiWeekServerTimer.current);
        multiWeekServerTimer.current = setTimeout(async () => {
            const result = await putJsonSafe(`${API_BASE}/multi-weekly-cook-plan`, multiWeeklyCookPlan);
            if (result.success) setSyncError(null);
            else setSyncError(result.error ?? 'Failed to sync weekly cook plan');
        }, 500);
        return () => clearTimeout(multiWeekServerTimer.current);
    }, [multiWeeklyCookPlan, hydrated]);

    useEffect(() => {
        if (!hydrated || recipes.length === 0) return;
        const recipesByName = new Map(recipes.map(r => [r.name, r]));
        setMealPlan(prev => {
            let changed = false;
            const newPlan = {...prev};
            Object.keys(newPlan).forEach(date => {
                const day = {...newPlan[date]};
                let dayChanged = false;
                ALL_MEAL_TYPES.forEach(type => {
                    const slots = day[type];
                    if (!Array.isArray(slots)) return;
                    const updated = slots.map(slot => {
                        const fresh = recipesByName.get(slot.recipe.name);
                        if (fresh && fresh !== slot.recipe) {
                            return {...slot, recipe: fresh};
                        }
                        return slot;
                    });
                    if (updated.some((s, i) => s !== slots[i])) {
                        day[type] = updated;
                        dayChanged = true;
                    }
                });
                if (dayChanged) {
                    newPlan[date] = day;
                    changed = true;
                }
            });
            return changed ? newPlan : prev;
        });
    }, [hydrated, recipes]);

    const updateMealPlanForRecipe = useCallback((oldName: string, updatedRecipe: Recipe | null) => {
        setMultiWeeklyCookPlan(prev => {
            const newMultiPlan = {...prev};
            let planChanged = false;
            Object.keys(newMultiPlan).forEach(week => {
                const weekPlan = {...newMultiPlan[week]};
                let weekChanged = false;

                // Handle UUID-keyed entries (new format) - look for items with matching recipeName
                Object.keys(weekPlan).forEach(instanceId => {
                    const item = weekPlan[instanceId];
                    if (item.recipeName === oldName) {
                        if (updatedRecipe) {
                            // Update the recipeName to the new name
                            weekPlan[instanceId] = { ...item, recipeName: updatedRecipe.name };
                        } else {
                            // Delete the entry if recipe is being removed
                            delete weekPlan[instanceId];
                        }
                        weekChanged = true;
                    }
                });

                if (weekChanged) {
                    newMultiPlan[week] = weekPlan;
                    planChanged = true;
                }
            });
            return planChanged ? newMultiPlan : prev;
        });

        setMealPlan(prev => {
            const newPlan = {...prev};
            let changed = false;
            Object.keys(newPlan).forEach(date => {
                const day = {...newPlan[date]};
                let dayChanged = false;
                ALL_MEAL_TYPES.forEach(type => {
                    const slots = day[type];
                    if (Array.isArray(slots)) {
                        if (updatedRecipe) {
                            const updated = slots.map(slot =>
                                slot.recipe.name === oldName ? {...slot, recipe: updatedRecipe} : slot
                            );
                            if (updated.some((s, i) => s.recipe !== slots[i].recipe)) {
                                day[type] = updated;
                                dayChanged = true;
                            }
                        } else {
                            const filtered = slots.filter(slot => slot.recipe.name !== oldName);
                            if (filtered.length !== slots.length) {
                                day[type] = filtered;
                                dayChanged = true;
                            }
                        }
                    }
                });
                if (dayChanged) {
                    newPlan[date] = day;
                    changed = true;
                }
            });
            return changed ? newPlan : prev;
        });
    }, []);

    return {
        mealPlan,
        setMealPlan,
        multiWeeklyCookPlan,
        setMultiWeeklyCookPlan,
        promptedRecipes,
        setPromptedRecipes,
        updateMealPlanForRecipe,
        hydrated,
        syncError
    };
}
