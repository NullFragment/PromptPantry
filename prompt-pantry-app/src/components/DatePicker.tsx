import {useEffect, useState} from 'react';
import {
    addDays,
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
    subMonths
} from 'date-fns';
import {ChevronLeft, ChevronRight, X} from 'lucide-react';

interface DatePickerProps {
    selectedDate: Date;
    onChange: (date: Date) => void;
    onClose: () => void;
}

export function DatePicker({selectedDate, onChange, onClose}: DatePickerProps) {
    const [currentMonth, setCurrentMonth] = useState(selectedDate);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, {weekStartsOn: 0});
    const endDate = endOfWeek(monthEnd, {weekStartsOn: 0});

    const calendarDays = [];
    let day = startDate;
    while (day <= endDate) {
        calendarDays.push(day);
        day = addDays(day, 1);
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
            <div
                className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 transition-colors duration-300">
                <div
                    className="p-4 border-b dark:border-gray-800 flex justify-between items-center bg-indigo-600 dark:bg-indigo-700 text-white">
                    <h3 className="font-bold">Select Date</h3>
                    <button onClick={onClose}
                            className="p-1 hover:bg-white/20 dark:hover:bg-gray-700/50 rounded-full transition-colors"
                            aria-label="Close">
                        <X className="h-5 w-5"/>
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span
                            className="font-bold text-gray-900 dark:text-gray-100">{format(currentMonth, 'MMMM yyyy')}</span>
                        <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-700">
                            <button
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                className="p-1.5 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                title="Previous Month"
                            >
                                <ChevronLeft className="h-4 w-4"/>
                            </button>
                            <button
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                className="p-1.5 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                title="Next Month"
                            >
                                <ChevronRight className="h-4 w-4"/>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={`${d}-${i}`}
                                 className="h-8 flex items-center justify-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{d}</div>
                        ))}
                        {calendarDays.map((date, idx) => {
                            const isSelected = isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, new Date());
                            const isCurrentMonth = isSameMonth(date, monthStart);

                            return (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        onChange(date);
                                        onClose();
                                    }}
                                    className={`h-10 w-full flex items-center justify-center rounded-lg text-sm font-medium transition-all
                    ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400'}
                    ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white' : ''}
                    ${isToday && !isSelected ? 'text-indigo-600 dark:text-indigo-400 font-bold underline decoration-2 underline-offset-4' : ''}
                  `}
                                >
                                    {format(date, 'd')}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => {
                            const today = new Date();
                            setCurrentMonth(today);
                            onChange(today);
                            onClose();
                        }}
                        className="w-full py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                        Go to Today
                    </button>
                </div>
            </div>
        </div>
    );
}
