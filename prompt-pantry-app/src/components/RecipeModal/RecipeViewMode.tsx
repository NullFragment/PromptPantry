import {Clock, Hash, Users, Utensils} from 'lucide-react';
import {
    Ingredient,
    IngredientGroup,
    InstructionGroup,
    Recipe
} from '../../types';
import {normalizeIngredientName, renderMeasurementWithConversion} from '../../utils/recipeUtils';
import {VideoEmbed} from '../VideoEmbed';

interface RecipeViewModeProps {
    recipe: Recipe;
    unitSystem: 'metric' | 'imperial' | 'both';
    highlightedIngredients?: string[];
    cookCount: number;
}

export function RecipeViewMode({recipe, unitSystem, highlightedIngredients, cookCount}: RecipeViewModeProps) {
    const isInstructionsGrouped = recipe.instructions.length > 0 && typeof recipe.instructions[0] === 'object' && 'steps' in recipe.instructions[0];

    return (
        <>
            <div className="flex flex-wrap gap-2">
                {recipe.categories.map(cat => (
                    <span key={cat}
                          className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                        {cat}
                    </span>
                ))}
            </div>

            <div className="pr-40">
                <h3 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-gray-100 mb-6 leading-tight">
                    {recipe.name}
                </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700"
                     title={`Calories: ${recipe.macros.calories} kcal / serving`}>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Calories</div>
                    <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">{recipe.macros.calories}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">kcal / serving</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700"
                     title={`Protein: ${recipe.macros.protein}g / serving`}>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Protein</div>
                    <div className="text-xl font-black text-gray-900 dark:text-gray-100">{recipe.macros.protein}g</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700"
                     title={`Fat: ${recipe.macros.fat}g / serving`}>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Fat</div>
                    <div className="text-xl font-black text-gray-900 dark:text-gray-100">{recipe.macros.fat}g</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700"
                     title={`Carbs: ${recipe.macros.carbs}g / serving`}>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Carbs</div>
                    <div className="text-xl font-black text-gray-900 dark:text-gray-100">{recipe.macros.carbs}g</div>
                </div>
            </div>

            {recipe.videoLink && (
                <div className="mb-10 aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
                    <VideoEmbed url={recipe.videoLink}/>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-8">
                    <div className="flex flex-wrap gap-4 text-sm font-bold text-gray-500 dark:text-gray-400 pb-6 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center"><Clock className="h-4 w-4 mr-2 text-indigo-500"/> Prep: {recipe.prepTime}</div>
                        <div className="flex items-center"><Utensils className="h-4 w-4 mr-2 text-indigo-500"/> Cook: {recipe.cookTime}</div>
                        <div className="flex items-center"><Users className="h-4 w-4 mr-2 text-indigo-500"/> Serves {recipe.servings}</div>
                        <div className="flex items-center" title="Total multiplier across all weekly plans (including fallbacks for scheduled meals)">
                            <Utensils className="h-4 w-4 mr-2 text-indigo-500"/> Cooked: {cookCount}x
                        </div>
                        {recipe.myFitnessPalId && (
                            <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                                <Hash className="h-3 w-3 mr-1"/> MFP: {recipe.myFitnessPalId}
                            </div>
                        )}
                    </div>

                    <div>
                        <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.2em] mb-6 flex items-center">
                            <span className="w-8 h-px bg-indigo-600 mr-3"></span>
                            Ingredients
                        </h4>
                        <div className="space-y-6">
                            {recipe.ingredients.length > 0 && 'ingredients' in recipe.ingredients[0] ? (
                                (recipe.ingredients as IngredientGroup[]).map((group, gIdx) => (
                                    <div key={gIdx} className={gIdx > 0 ? 'pt-2' : ''}>
                                        <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3 flex items-center">
                                            {group.name}
                                            <span className="ml-2 flex-1 h-px bg-gray-100 dark:bg-gray-800"></span>
                                        </h5>
                                        <ul className="space-y-4">
                                            {group.ingredients.map((ing, iIdx) => {
                                                const isHighlighted = highlightedIngredients?.includes(normalizeIngredientName(ing.ingredient));
                                                return (
                                                    <li key={iIdx} className={`flex items-start group ${isHighlighted ? 'bg-indigo-50 dark:bg-indigo-900/20 -mx-2 px-2 py-1 rounded-lg' : ''}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full mt-2 mr-3 group-hover:bg-indigo-500 transition-colors ${isHighlighted ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-indigo-200 dark:bg-indigo-800'}`}></span>
                                                        <div className="flex-1">
                                                            <span className="font-bold text-gray-900 dark:text-gray-100 mr-2">{renderMeasurementWithConversion(ing, unitSystem)}</span>
                                                            <span className={`text-gray-600 dark:text-gray-400 capitalize ${isHighlighted ? 'text-indigo-900 dark:text-indigo-200' : ''}`}>{ing.ingredient}</span>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))
                            ) : (
                                <ul className="space-y-4">
                                    {(recipe.ingredients as Ingredient[]).map((ing, idx) => {
                                        const isHighlighted = highlightedIngredients?.includes(normalizeIngredientName(ing.ingredient));
                                        return (
                                            <li key={idx} className={`flex items-start group ${isHighlighted ? 'bg-indigo-50 dark:bg-indigo-900/20 -mx-2 px-2 py-1 rounded-lg' : ''}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mt-2 mr-3 group-hover:bg-indigo-500 transition-colors ${isHighlighted ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-indigo-200 dark:bg-indigo-800'}`}></span>
                                                <div className="flex-1">
                                                    <span className="font-bold text-gray-900 dark:text-gray-100 mr-2">{renderMeasurementWithConversion(ing, unitSystem)}</span>
                                                    <span className={`text-gray-600 dark:text-gray-400 capitalize ${isHighlighted ? 'text-indigo-900 dark:text-indigo-200' : ''}`}>{ing.ingredient}</span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>

                    {recipe.tags.length > 0 && (
                        <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex flex-wrap gap-2">
                                {recipe.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2">
                    <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.2em] mb-8 flex items-center">
                        <span className="w-8 h-px bg-indigo-600 mr-3"></span>
                        Instructions
                    </h4>
                    <div className="space-y-8">
                        {isInstructionsGrouped ? (
                            (recipe.instructions as InstructionGroup[]).map((group, gIdx) => (
                                <div key={gIdx} className="space-y-6">
                                    <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center">
                                        {group.name}
                                        <span className="ml-2 flex-1 h-px bg-gray-100 dark:bg-gray-800"></span>
                                    </h5>
                                    <div className="space-y-6">
                                        {group.steps.map((step, sIdx) => (
                                            <div key={sIdx} className="flex group">
                                                <div className="mr-6">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">
                                                        {sIdx + 1}
                                                    </div>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-1 flex-1">{step}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="space-y-8">
                                {(recipe.instructions as string[]).map((step, idx) => (
                                    <div key={idx} className="flex group">
                                        <div className="mr-6">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">
                                                {idx + 1}
                                            </div>
                                        </div>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-1 flex-1">{step}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {recipe.notes && (
                        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
                            <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.2em] mb-4 flex items-center">
                                <span className="w-8 h-px bg-indigo-600 mr-3"></span>
                                Notes
                            </h4>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{recipe.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
