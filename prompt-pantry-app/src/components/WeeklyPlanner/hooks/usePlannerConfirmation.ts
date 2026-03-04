import { useState, type Dispatch, type SetStateAction } from 'react';
import type { PlannerConfirmation } from '../weeklyPlannerTypes';

export function usePlannerConfirmation(): [
    PlannerConfirmation | null,
    Dispatch<SetStateAction<PlannerConfirmation | null>>
] {
    return useState<PlannerConfirmation | null>(null);
}
