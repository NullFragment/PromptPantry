import {render, screen} from '@testing-library/react';
import {ParticipantProgress} from '../../src/components/ParticipantProgress';
import {describe, expect, it} from 'vitest';
import {Macros, Participant} from '../../src/types';

describe('ParticipantProgress', () => {
    const participant: Participant = {
        name: 'Alice',
        maintenanceCalories: 2000,
        calorieDeficit: 10, // 2000 * 0.9 = 1800
        proteinPercent: 25, // 1800 * 0.25 / 4 = 112.5
        carbsPercent: 50, // 1800 * 0.5 / 4 = 225
        fatPercent: 25, // 1800 * 0.25 / 9 = 50
    };

    const currentMacros: Macros = {
        calories: 1500,
        protein: 80,
        carbs: 150,
        fat: 50
    };

    it('renders progress for a participant', () => {
        render(<ParticipantProgress participant={participant} currentMacros={currentMacros}/>);

        expect(screen.getByText('Alice')).toBeInTheDocument();

        // Check values
        expect(screen.getByText(/Kcal: 1500 \/ 1800/)).toBeInTheDocument();
        expect(screen.getByText(/P: 80\/113/)).toBeInTheDocument();
        expect(screen.getByText(/F: 50\/50/)).toBeInTheDocument();
        expect(screen.getByText(/C: 150\/225/)).toBeInTheDocument();
    });

    it('renders compact mode', () => {
        render(<ParticipantProgress participant={participant} currentMacros={currentMacros} compact={true}/>);
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText(/Kcal: 1500 \/ 1800/)).toBeInTheDocument();
    });

    it('shows gray styles when below targets and correct colors when over', () => {
        const below: Macros = {calories: 1500, protein: 80, carbs: 150, fat: 40};
        render(<ParticipantProgress participant={participant} currentMacros={below}/>);
        expect(screen.getByText(/Kcal: 1500 \/ 1800/)).toHaveClass('text-gray-500');
        expect(screen.getByText(/P: 80\/113/)).toHaveClass('text-gray-500');

        const green: Macros = {calories: 1860, protein: 120, carbs: 230, fat: 52};
        render(<ParticipantProgress participant={participant} currentMacros={green}/>);
        expect(screen.getByText(/Kcal: 1860 \/ 1800/)).toHaveClass('text-green-600');

        const yellow: Macros = {calories: 1950, protein: 125, carbs: 240, fat: 55};
        render(<ParticipantProgress participant={participant} currentMacros={yellow}/>);
        expect(screen.getByText(/Kcal: 1950 \/ 1800/)).toHaveClass('text-yellow-600');
    });

    it('stacks macros vertically in compact mode with smaller bars', () => {
        render(<ParticipantProgress participant={participant} currentMacros={currentMacros} compact={true}/>);
        expect(screen.getAllByTestId('compact-macro-label')).toHaveLength(3);
        expect(screen.getAllByTestId('compact-macro-bar')).toHaveLength(3);
    });
});
