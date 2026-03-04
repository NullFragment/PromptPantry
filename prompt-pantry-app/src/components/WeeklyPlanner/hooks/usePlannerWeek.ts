import { addDays, format, startOfWeek } from 'date-fns';
import { useMemo } from 'react';

export interface UsePlannerWeekResult {
    weekStart: Date;
    weekEnd: Date;
    weekDays: Date[];
    weekStartStr: string;
}

export function usePlannerWeek(selectedDate: Date): UsePlannerWeekResult {
    return useMemo(() => {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const weekEnd = addDays(weekStart, 6);
        const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        return { weekStart, weekEnd, weekDays, weekStartStr };
    }, [selectedDate]);
}
