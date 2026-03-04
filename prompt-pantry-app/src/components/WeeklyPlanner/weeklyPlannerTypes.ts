import type { Recipe, WeeklyCookPlanItem } from '../../types';

/** One leftover recipe from a previous week (for leftover prompt modal) */
export interface LeftoverItem {
    name: string;
    count: number;
    fromWeek: string;
    instanceId: string;
    allWeeks?: string[];
    allInstances?: { instanceId: string; weekStr: string; count: number }[];
}

/** Confirmation dialog state used by WeeklyPlanner and hooks */
export interface PlannerConfirmation {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: 'danger' | 'info';
}

/** Data for one card in the "Recipes to cook" sidebar list */
export interface WeeklyRecipeCardData {
    key: string;
    instanceId: string;
    name: string;
    recipe: Recipe;
    servings: number;
    used: number;
    remaining: number;
    type: 'base' | 'transferred';
    item: WeeklyCookPlanItem;
    transferredFromDate?: string;
    originalSourceWeek?: string;
}
