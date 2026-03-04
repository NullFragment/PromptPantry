import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import App from '../src/App';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

describe('App', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.useFakeTimers({shouldAdvanceTime: true});
        const meData = {username: 'testuser', tier: 'Admin'};
        const settingsData = {
            registrationEnabled: true,
            advancedMode: false,
            macroLimits: {proteinPercentMin: 0, proteinPercentMax: 100, fatPercentMin: 0, fatPercentMax: 100, calorieDeficitMax: 25}
        };
        const recipesData = [
            {
                name: 'Test Recipe',
                categories: ['Dinner'],
                prepTime: '10',
                cookTime: '20',
                servings: 4,
                tags: [],
                ingredients: [],
                instructions: [],
                macros: {calories: 500, protein: 20, carbs: 60, fat: 10}
            },
            {
                name: 'Lunch Recipe',
                categories: ['Lunch'],
                prepTime: '5',
                cookTime: '10',
                servings: 2,
                tags: ['quick'],
                ingredients: [],
                instructions: [],
                macros: {calories: 300, protein: 15, carbs: 30, fat: 5}
            }
        ];
        const mockRes = (data: unknown) => ({
            ok: true,
            status: 200,
            json: () => Promise.resolve(data),
            text: () => Promise.resolve(JSON.stringify(data)),
        });
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            if (url === '/api/me') return Promise.resolve(mockRes(meData));
            if (url === '/api/settings') return Promise.resolve(mockRes(settingsData));
            if (url.includes('/api/ingredients')) return Promise.resolve(mockRes([]));
            if (url.includes('/api/participants')) return Promise.resolve(mockRes([]));
            return Promise.resolve(mockRes(recipesData));
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders and switches views', async () => {
        await act(async () => {
            render(<App/>);
        });

        // Default view is recipes
        await waitFor(() => {
            expect(screen.getByText('Test Recipe')).toBeInTheDocument();
        });

        // Switch to calendar
        await act(async () => {
            fireEvent.click(screen.getByText(/Plan Overview/i).closest('button')!);
        });
        expect(screen.getByText(/Monthly View/i)).toBeInTheDocument();

        // Switch to weekly
        await act(async () => {
            fireEvent.click(screen.getByText(/Weekly Planner/i).closest('button')!);
        });
        expect(screen.getAllByText(/Weekly Recipes/i).length).toBeGreaterThan(0);

        // Switch to participants
        await act(async () => {
            fireEvent.click(screen.getByRole('button', {name: /Participants/i}));
        });
        expect(screen.getByText(/Meal Plan Participants/i)).toBeInTheDocument();

        // Switch to admin (visible for Admin tier)
        await act(async () => {
            fireEvent.click(screen.getByRole('button', {name: /Admin/i}));
        });
        expect(screen.getByText(/Admin Settings/i)).toBeInTheDocument();

        // Switch to shopping
        await act(async () => {
            fireEvent.click(screen.getByRole('button', {name: /Shopping List/i}));
        });
        expect(screen.getAllByText(/Shopping List/i).length).toBeGreaterThan(0);
    });

    it('can search and sort recipes', async () => {
        await act(async () => {
            render(<App/>);
        });

        // Switch to table view
        await act(async () => {
            fireEvent.click(screen.getByTitle(/Table View/i));
        });

        const searchInput = await screen.findByPlaceholderText(/Search recipes/i);
        await act(async () => {
            fireEvent.change(searchInput, {target: {value: 'Test'}});
        });
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();

        const nameHeader = screen.getByRole('columnheader', {name: /Name/i});
        await act(async () => {
            fireEvent.click(nameHeader); // Sort by name
        });
    });

    it('can open and close recipe modal', async () => {
        await act(async () => {
            render(<App/>);
        });
        const recipeRow = await screen.findByText('Test Recipe');
        await act(async () => {
            fireEvent.click(recipeRow);
        });

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        await act(async () => {
            const closeButton = screen.getByTitle(/Close Modal/i);
            fireEvent.click(closeButton);
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('can toggle settings', async () => {
        await act(async () => {
            render(<App/>);
        });

        // Wait for initial render to complete
        await waitFor(() => {
            expect(screen.getByTitle(/Switch to (Dark|Light) Mode/i)).toBeInTheDocument();
        });

        const themeButton = screen.getByTitle(/Switch to (Dark|Light) Mode/i);
        const initialTitle = themeButton.getAttribute('title');
        await act(async () => {
            fireEvent.click(themeButton);
        });
        const newTitle = initialTitle === 'Switch to Dark Mode' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        expect(screen.getByTitle(newTitle)).toBeInTheDocument();

        await act(async () => {
            const metricButton = screen.getByRole('button', {name: /met/i});
            fireEvent.click(metricButton);
        });
    });

    it('can toggle categories', async () => {
        await act(async () => {
            render(<App/>);
        });
        await waitFor(() => {
            expect(screen.getByRole('button', {name: 'Dinner'})).toBeInTheDocument();
        });
        const dinnerButton = screen.getByRole('button', {name: 'Dinner'});
        await act(async () => {
            fireEvent.click(dinnerButton);
        });
        // Should still show Test Recipe since it is a Dinner
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();

        const lunchButton = screen.getByRole('button', {name: 'Lunch'});
        await act(async () => {
            fireEvent.click(lunchButton);
        });
        // Now both Lunch and Dinner are selected. Test Recipe is Dinner, so it should show.
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });

    it('can open add recipe modal', async () => {
        await act(async () => {
            render(<App/>);
        });

        await waitFor(() => {
            expect(screen.getByTitle('Add Recipe')).toBeInTheDocument();
        });

        const addButton = screen.getByTitle('Add Recipe');
        await act(async () => {
            fireEvent.click(addButton);
        });
        expect(screen.getByText(/Add New Recipe/i)).toBeInTheDocument();
    });
});
