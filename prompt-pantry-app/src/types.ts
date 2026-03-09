// ============================================
// Ingredient Definition Types (for ingredient management)
// ============================================

export interface WeightMeasurement {
    quantity: number;
    unit: string; // e.g., "g", "kg", "oz", "lb"
}

export interface VolumeMeasurement {
    quantity: number;
    unit: string; // e.g., "ml", "l", "cup", "tbsp", "tsp"
}

export interface PortionMeasurement {
    quantity: number;
    description: string; // e.g., "clove", "head", "stalk"
}

export interface IngredientConversions {
    weightToVolume?: {
        weight: WeightMeasurement;
        volume: VolumeMeasurement;
    };
    portionToVolume?: {
        portion: PortionMeasurement;
        volume: VolumeMeasurement;
    };
}

export interface ContainerSize {
    quantity: number;
    unit: string;
    label?: string;
}

export interface IngredientDefinition {
    id: string; // UUID
    name: string; // Canonical name, unique
    storeSection: string; // e.g., "Produce", "Dairy", "Unassigned"
    aliases?: string[]; // Alternative names/preparations
    containerSizes?: ContainerSize[];
    conversions?: IngredientConversions;
}

// ============================================
// Recipe Ingredient Types (used within recipes)
// ============================================

export interface Ingredient {
    ingredient: string; // Display name (can be alias or canonical name)
    ingredientId?: string; // Reference to IngredientDefinition.id
    quantity?: string;
    measure?: string;
    metric?: {
        quantity: string;
        measure: string;
    };
    imperial?: {
        quantity: string;
        measure: string;
    };
}

export interface IngredientGroup {
    name: string;
    ingredients: Ingredient[];
}

export interface InstructionGroup {
    name: string;
    steps: string[];
}

export interface Macros {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface Recipe {
    name: string;
    categories: ("Breakfast" | "Lunch" | "Dinner" | "Snack" | "Side" | "Drink" | "Misc")[];
    prepTime: string;
    cookTime: string;
    servings: number;
    tags: string[];
    ingredients: Ingredient[] | IngredientGroup[];
    instructions: string[] | InstructionGroup[];
    macros: Macros;
    myFitnessPalId?: string;
    videoLink?: string;
    notes?: string;
    rating?: 'up' | 'down' | 'neutral';
    isFavorite?: boolean;
    /** When set, this recipe is a variant of the named base recipe. */
    baseRecipeName?: string;
    /** Variant-only: additional ingredients to append to base. */
    ingredientAdditions?: Ingredient[];
    /** Variant-only: additional instruction steps to append to base. */
    instructionAdditions?: string[];
}

/** Compact storage format for meal slots - only stores references, not full recipe data */
export interface CompactMealSlot {
    recipeName: string;
    servings: number;
    participant?: string;
    recipeInstanceId?: string;
}

/** Full meal slot with hydrated recipe data */
export interface MealSlot {
    recipe: Recipe;
    servings: number;
    participant?: string;
    recipeInstanceId?: string;
}

/** Compact storage format for meal plan - used for persistence */
export interface CompactMealPlan {
    [date: string]: {
        breakfast?: CompactMealSlot[];
        lunch?: CompactMealSlot[];
        dinner?: CompactMealSlot[];
        snacks?: CompactMealSlot[];
        drinks?: CompactMealSlot[];
    };
}

export interface MealPlan {
    [date: string]: {
        breakfast?: MealSlot[];
        lunch?: MealSlot[];
        dinner?: MealSlot[];
        snacks?: MealSlot[];
        drinks?: MealSlot[];
    };
}

export interface WeeklyCookPlanItem {
    recipeName: string;
    servings: number;
    multiplier?: number;
    manualUsed?: number;
    /** Week start date this instance was transferred from (e.g., '2025-02-01') */
    transferredFromDate?: string;
    /** UUID of the source instance this was transferred from */
    transferredFromId?: string;
}

export interface WeeklyCookPlan {
    /** Keyed by UUID */
    [instanceId: string]: WeeklyCookPlanItem;
}

export interface MultiWeeklyCookPlan {
    [weekStart: string]: WeeklyCookPlan;
}

export interface Participant {
    name: string;
    icon?: string;
    maintenanceCalories: number;
    calorieDeficit: number;
    proteinPercent: number;
    carbsPercent: number;
    fatPercent: number;
}

/** Used in Participants form state; numeric fields may be string while user is typing */
export type ParticipantEditing = Omit<Participant, 'maintenanceCalories' | 'calorieDeficit' | 'proteinPercent' | 'fatPercent'> & {
    maintenanceCalories: number | string;
    calorieDeficit: number | string;
    proteinPercent: number | string;
    fatPercent: number | string;
};

export interface ValidationError {
    path: string;
    message: string;
}

export type UserTier = 'Viewer' | 'Editor' | 'Admin';

export interface User {
    username: string;
    tier: UserTier;
}
