import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import App from '../src/App';
import {Participant, Recipe} from '../src/types';

const mockRecipe: Recipe = {
    name: 'Mock Recipe',
    categories: ['Dinner'],
    prepTime: '5',
    cookTime: '10',
    servings: 2,
    tags: [],
    ingredients: [],
    instructions: [],
    macros: {calories: 200, protein: 10, carbs: 20, fat: 5}
};

const mockParticipant: Participant = {
    name: 'User',
    maintenanceCalories: 2000,
    calorieDeficit: 500,
    proteinPercent: 30,
    carbsPercent: 40,
    fatPercent: 30
};

const defaultUIState = {
    view: 'recipes' as const,
    setView: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    unitSystem: 'metric' as const,
    setUnitSystem: vi.fn(),
    viewMode: 'grid' as const,
    setViewMode: vi.fn(),
    darkMode: false,
    setDarkMode: vi.fn(),
};

const mockUseUIState = vi.fn();
const mockSaveRecipe = vi.fn();
const mockDeleteRecipe = vi.fn();
const mockSaveParticipants = vi.fn();
const mockUpdateMealPlanForRecipe = vi.fn();

vi.mock('../src/hooks/useUIState', () => ({
    useUIState: () => mockUseUIState(),
}));

vi.mock('../src/hooks/useRecipes', () => ({
    useRecipes: () => ({
        recipes: [mockRecipe],
        fetchRecipes: vi.fn(),
        saveRecipe: mockSaveRecipe,
        deleteRecipe: mockDeleteRecipe,
    }),
}));

vi.mock('../src/hooks/useParticipants', () => ({
    useParticipants: () => ({
        participants: [mockParticipant],
        fetchParticipants: vi.fn(),
        saveParticipants: mockSaveParticipants,
    }),
}));

vi.mock('../src/hooks/useMealPlan', () => ({
    useMealPlan: () => ({
        mealPlan: {},
        setMealPlan: vi.fn(),
        multiWeeklyCookPlan: {},
        setMultiWeeklyCookPlan: vi.fn(),
        promptedRecipes: {},
        setPromptedRecipes: vi.fn(),
        updateMealPlanForRecipe: mockUpdateMealPlanForRecipe,
    }),
}));

vi.mock('../src/hooks/useRecipeFilters', () => ({
    useRecipeFilters: () => ({
        allTags: [],
        allCategories: [],
        sortedAndFilteredRecipes: [mockRecipe],
        toggleTag: vi.fn(),
        toggleCategory: vi.fn(),
        handleSort: vi.fn(),
        clearFilters: vi.fn(),
        sortConfig: null,
        selectedTags: [],
        selectedCategories: [],
    }),
}));

vi.mock('../src/components/Navigation', () => ({
    Navigation: ({setView}: { setView: (v: string) => void }) => (
        <div>
            <button onClick={() => setView('recipes')}>NavRecipes</button>
            <button onClick={() => setView('participants')}>NavParticipants</button>
        </div>
    ),
}));

vi.mock('../src/components/RecipeView', () => ({
    RecipeView: ({setSelectedRecipe, onDeleteRecipes}: any) => (
        <div>
            <button onClick={() => setSelectedRecipe({recipe: mockRecipe, readOnly: false})}>OpenRecipe</button>
            <button onClick={() => onDeleteRecipes([mockRecipe.name])}>BulkDelete</button>
        </div>
    ),
}));

vi.mock('../src/components/RecipeModal', () => ({
    RecipeModal: ({onSave, onDelete, onClose, recipe}: any) => (
        <div role="dialog">
            <button onClick={() => onSave(recipe, null)}>SaveModal</button>
            <button onClick={() => onSave(recipe, null, true)}>SaveModalKeepOpen</button>
            <button onClick={() => onDelete(recipe.name)}>DeleteModal</button>
            <button onClick={onClose}>CloseModal</button>
        </div>
    ),
}));

vi.mock('../src/components/Participants', () => ({
    Participants: ({onSave}: any) => (
        <div>
            <button onClick={() => onSave([mockParticipant])}>TriggerSaveParticipants</button>
            <button onClick={() => onSave([mockParticipant], false)}>TriggerSaveSilent</button>
        </div>
    ),
}));

vi.mock('../src/components/ConfirmationDialog', () => ({
    ConfirmationDialog: ({title, message, onConfirm, onCancel}: any) => (
        <div role="alertdialog">
            <span>{title}</span>
            <p>{message}</p>
            <button onClick={onConfirm}>Confirm</button>
            {onCancel && <button onClick={onCancel}>Cancel</button>}
        </div>
    ),
}));

vi.mock('../src/components/Calendar', () => ({
    Calendar: ({setSelectedDate, currentMonth}: any) => (
        <div>
            <span data-testid="month-display">Month: {currentMonth.getMonth()}</span>
            <button onClick={() => setSelectedDate(new Date(2026, 1, 1))}>ChangeMonth</button>
        </div>
    )
}));
vi.mock('../src/components/WeeklyPlanner', () => ({WeeklyPlanner: () => <div>WeeklyPlannerMock</div>}));
vi.mock('../src/components/ShoppingList', () => ({ShoppingList: () => <div>ShoppingListMock</div>}));

beforeEach(() => {
    vi.clearAllMocks();
    mockUseUIState.mockReturnValue(defaultUIState);
    mockSaveRecipe.mockResolvedValue({success: false, error: 'Failed to save recipe'});
    mockDeleteRecipe.mockResolvedValue(true);
    mockSaveParticipants.mockResolvedValue(true);
});

describe('App confirmations and error dialogs', () => {
    it('shows confirmation when participants are saved', async () => {
        mockUseUIState.mockReturnValue({...defaultUIState, view: 'participants'});

        render(<App/>);

        fireEvent.click(screen.getByText('TriggerSaveParticipants'));

        const dialog = await screen.findByRole('alertdialog');
        expect(dialog).toHaveTextContent('Participants saved successfully');

        fireEvent.click(screen.getByText('Confirm'));
        await waitFor(() => {
            expect(screen.queryByText('Participants saved successfully')).not.toBeInTheDocument();
        });
    });

    it('shows error dialog when saving recipe fails', async () => {
        mockUseUIState.mockReturnValue(defaultUIState);

        render(<App/>);

        fireEvent.click(screen.getByText('OpenRecipe'));
        fireEvent.click(await screen.findByText('SaveModal'));

        const dialog = await screen.findByRole('alertdialog');
        expect(dialog).toHaveTextContent('Failed to save recipe');
    });

    it('deletes a recipe after confirming in modal', async () => {
        mockUseUIState.mockReturnValue(defaultUIState);
        mockDeleteRecipe.mockResolvedValue(true);

        render(<App/>);

        fireEvent.click(screen.getByText('OpenRecipe'));
        fireEvent.click(await screen.findByText('DeleteModal'));

        const dialog = await screen.findByRole('alertdialog');
        expect(dialog).toHaveTextContent('Delete Recipe');

        fireEvent.click(screen.getByText('Confirm'));

        await waitFor(() => expect(mockDeleteRecipe).toHaveBeenCalledWith('Mock Recipe'));
        expect(mockUpdateMealPlanForRecipe).toHaveBeenCalledWith('Mock Recipe', null);
    });

    it('confirms bulk delete of recipes', async () => {
        mockUseUIState.mockReturnValue(defaultUIState);
        mockDeleteRecipe.mockResolvedValue(true);

        render(<App/>);

        fireEvent.click(screen.getByText('BulkDelete'));

        const dialog = await screen.findByRole('alertdialog');
        expect(dialog).toHaveTextContent('Delete Recipes');

        fireEvent.click(screen.getByText('Confirm'));

        await waitFor(() => expect(mockDeleteRecipe).toHaveBeenCalledWith('Mock Recipe'));
        expect(mockUpdateMealPlanForRecipe).toHaveBeenCalledWith('Mock Recipe', null);
    });

    it('shows warning when bulk delete fails', async () => {
        mockUseUIState.mockReturnValue(defaultUIState);
        mockDeleteRecipe.mockResolvedValue(false);

        render(<App/>);

        fireEvent.click(screen.getByText('BulkDelete'));
        fireEvent.click(await screen.findByText('Confirm'));

        const warning = await screen.findByText('Some recipes could not be deleted');
        expect(warning).toBeInTheDocument();
    });

    it('cancels recipe deletion', async () => {
        mockUseUIState.mockReturnValue(defaultUIState);
        render(<App/>);

        fireEvent.click(screen.getByText('OpenRecipe'));
        fireEvent.click(await screen.findByText('DeleteModal'));

        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(mockDeleteRecipe).not.toHaveBeenCalled();
    });

    it('updates currentMonth when selectedDate changes to a different month', async () => {
        mockUseUIState.mockReturnValue({...defaultUIState, view: 'calendar'});
        render(<App/>);

        const display = screen.getByTestId('month-display');
        const currentMonth = new Date().getMonth();
        expect(display).toHaveTextContent(`Month: ${currentMonth}`);

        fireEvent.click(screen.getByText('ChangeMonth'));

        await waitFor(() => {
            expect(display).toHaveTextContent('Month: 1');
        });
    });

    it('saves recipe and keeps modal open if keepOpen is true', async () => {
        mockUseUIState.mockReturnValue(defaultUIState);
        mockSaveRecipe.mockResolvedValue({success: true});

        render(<App/>);

        fireEvent.click(screen.getByText('OpenRecipe'));
        const saveButton = await screen.findByText('SaveModalKeepOpen');

        fireEvent.click(saveButton);

        await waitFor(() => expect(mockSaveRecipe).toHaveBeenCalled());
        expect(screen.queryByRole('dialog')).toBeInTheDocument();
    });

    it('handles saveParticipants without success dialog', async () => {
        mockUseUIState.mockReturnValue({...defaultUIState, view: 'participants'});
        mockSaveParticipants.mockResolvedValue(true);

        render(<App/>);

        fireEvent.click(screen.getByText('TriggerSaveSilent'));
        await waitFor(() => expect(mockSaveParticipants).toHaveBeenCalled());
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
});