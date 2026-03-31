import {describe, expect, it, vi} from 'vitest';
import {fireEvent, screen} from '@testing-library/react';
import {RecipeView} from '../../src/components/RecipeView';
import {Recipe} from '../../src/types';
import {renderWithAppContext} from '../testHelpers';

const mockRecipes: Recipe[] = [
    {
        id: 'recipe-pasta-carbonara',
        name: 'Pasta Carbonara',
        categories: ['Dinner', 'Italian'],
        tags: ['quick', 'comfort-food'],
        prepTime: '10',
        cookTime: '20',
        servings: 4,
        ingredients: [],
        instructions: [],
        macros: {calories: 500, protein: 25, carbs: 60, fat: 15}
    },
    {
        id: 'recipe-greek-salad',
        name: 'Greek Salad',
        categories: ['Lunch', 'Mediterranean'],
        tags: ['healthy', 'vegetarian'],
        prepTime: '15',
        cookTime: '0',
        servings: 2,
        ingredients: [],
        instructions: [],
        macros: {calories: 200, protein: 10, carbs: 15, fat: 12}
    }
];

describe('RecipeView', () => {
    const defaultProps = {
        recipes: mockRecipes,
        sortedAndFilteredRecipes: mockRecipes,
        viewMode: 'grid' as const,
        setViewMode: vi.fn(),
        searchQuery: '',
        setSearchQuery: vi.fn(),
        allTags: ['quick', 'healthy', 'vegetarian', 'comfort-food'],
        selectedTags: [],
        toggleTag: vi.fn(),
        allCategories: ['Dinner', 'Lunch', 'Italian', 'Mediterranean'],
        selectedCategories: [],
        toggleCategory: vi.fn(),
        selectedRatings: [],
        toggleRating: vi.fn(),
        showOnlyFavorites: false,
        setShowOnlyFavorites: vi.fn(),
        showOnlyNeverCooked: false,
        setShowOnlyNeverCooked: vi.fn(),
        clearFilters: vi.fn(),
        sortConfig: null,
        handleSort: vi.fn(),
        setSelectedRecipe: vi.fn(),
        onDeleteRecipes: vi.fn(),
        multiWeeklyCookPlan: {},
    };

    it('renders recipe cards in grid mode', () => {
        renderWithAppContext(<RecipeView {...defaultProps} />);

        expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
        expect(screen.getByText('Greek Salad')).toBeInTheDocument();
    });

    it('renders recipes in table mode', () => {
        renderWithAppContext(<RecipeView {...defaultProps} viewMode="table"/>);

        expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
        expect(screen.getByText('Greek Salad')).toBeInTheDocument();
        // Table should have column headers
        expect(screen.getByRole('columnheader', {name: /Name/i})).toBeInTheDocument();
    });

    it('shows category filter buttons', () => {
        renderWithAppContext(<RecipeView {...defaultProps} />);

        expect(screen.getByRole('button', {name: 'Dinner'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Lunch'})).toBeInTheDocument();
    });

    it('shows tag filter buttons', () => {
        renderWithAppContext(<RecipeView {...defaultProps} />);

        expect(screen.getByRole('button', {name: 'quick'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'healthy'})).toBeInTheDocument();
    });

    it('calls toggleCategory when category button is clicked', () => {
        const toggleCategory = vi.fn();
        renderWithAppContext(<RecipeView {...defaultProps} toggleCategory={toggleCategory}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Dinner'}));
        expect(toggleCategory).toHaveBeenCalledWith('Dinner');
    });

    it('calls toggleTag when tag button is clicked', () => {
        const toggleTag = vi.fn();
        renderWithAppContext(<RecipeView {...defaultProps} toggleTag={toggleTag}/>);

        fireEvent.click(screen.getByRole('button', {name: 'quick'}));
        expect(toggleTag).toHaveBeenCalledWith('quick');
    });

    it('shows clear filters button when filters are active', () => {
        renderWithAppContext(<RecipeView {...defaultProps} selectedTags={['quick']}/>);

        expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    it('does not show clear filters when no filters are active', () => {
        renderWithAppContext(<RecipeView {...defaultProps} />);

        expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
    });

    it('calls clearFilters when clear button is clicked', () => {
        const clearFilters = vi.fn();
        renderWithAppContext(<RecipeView {...defaultProps} selectedTags={['quick']} clearFilters={clearFilters}/>);

        fireEvent.click(screen.getByText('Clear all'));
        expect(clearFilters).toHaveBeenCalled();
    });

    it('updates search query when typing in search input', () => {
        const setSearchQuery = vi.fn();
        renderWithAppContext(<RecipeView {...defaultProps} setSearchQuery={setSearchQuery}/>);

        const searchInput = screen.getByPlaceholderText(/Search recipes/i);
        fireEvent.change(searchInput, {target: {value: 'pasta'}});

        expect(setSearchQuery).toHaveBeenCalledWith('pasta');
    });

    it('toggles view mode between grid and table', () => {
        const setViewMode = vi.fn();
        renderWithAppContext(<RecipeView {...defaultProps} setViewMode={setViewMode}/>);

        const tableButton = screen.getByTitle('Table View');
        fireEvent.click(tableButton);

        expect(setViewMode).toHaveBeenCalledWith('table');
    });

    it('opens recipe modal when clicking a recipe card', () => {
        const setSelectedRecipe = vi.fn();
        renderWithAppContext(<RecipeView {...defaultProps} setSelectedRecipe={setSelectedRecipe}/>);

        fireEvent.click(screen.getByText('Pasta Carbonara'));

        expect(setSelectedRecipe).toHaveBeenCalled();
        expect(setSelectedRecipe.mock.calls[0][0].recipe.name).toBe('Pasta Carbonara');
    });

    it('can select recipes for bulk operations in table mode', () => {
        renderWithAppContext(<RecipeView {...defaultProps} viewMode="table"/>);

        // In table view, there should be selection functionality
        // Look for the recipe rows and try to select
        const pastaRow = screen.getByText('Pasta Carbonara').closest('tr');
        expect(pastaRow).toBeInTheDocument();
    });

    it('toggles select all in table view', () => {
        renderWithAppContext(<RecipeView {...defaultProps} viewMode="table"/>);

        const selectAllButton = screen.getByTitle('Select All');
        fireEvent.click(selectAllButton);

        expect(screen.getByTitle('Delete Selected')).toBeInTheDocument();
        expect(screen.getByText(/Delete selected/i)).toBeInTheDocument();
        expect(screen.getByTitle('Deselect All')).toBeInTheDocument();

        fireEvent.click(screen.getByTitle('Deselect All'));
        expect(screen.queryByTitle('Delete Selected')).not.toBeInTheDocument();
    });

    it('performs bulk delete for selected recipes', () => {
        const onDeleteRecipes = vi.fn();
        renderWithAppContext(<RecipeView {...defaultProps} viewMode="table" onDeleteRecipes={onDeleteRecipes}/>);

        fireEvent.click(screen.getByTitle('Select All'));
        const deleteButton = screen.getByTitle('Delete Selected');

        fireEvent.click(deleteButton);

        expect(onDeleteRecipes).toHaveBeenCalledWith(['recipe-pasta-carbonara', 'recipe-greek-salad']);
        expect(screen.queryByTitle('Delete Selected')).not.toBeInTheDocument();
    });

    it('shows add recipe button', () => {
        renderWithAppContext(<RecipeView {...defaultProps} />);

        expect(screen.getByTitle('Add Recipe')).toBeInTheDocument();
    });

    it('opens new recipe modal when clicking add button', () => {
        const setSelectedRecipe = vi.fn();
        renderWithAppContext(<RecipeView {...defaultProps} setSelectedRecipe={setSelectedRecipe}/>);

        fireEvent.click(screen.getByTitle('Add Recipe'));

        expect(setSelectedRecipe).toHaveBeenCalled();
    });

    it('shows empty state when no recipes match filters', () => {
        renderWithAppContext(<RecipeView {...defaultProps} sortedAndFilteredRecipes={[]}/>);

        expect(screen.getByText(/No recipes found/i)).toBeInTheDocument();
    });

    it('displays recipe macros in grid view', () => {
        renderWithAppContext(<RecipeView {...defaultProps} />);

        // Should show calories for recipes
        expect(screen.getByText(/500/)).toBeInTheDocument();
        expect(screen.getByText(/200/)).toBeInTheDocument();
    });

    it('sorts table by column when header is clicked', () => {
        const handleSort = vi.fn();
        renderWithAppContext(<RecipeView {...defaultProps} viewMode="table" handleSort={handleSort}/>);

        const nameHeader = screen.getByRole('columnheader', {name: /Name/i});
        fireEvent.click(nameHeader);

        expect(handleSort).toHaveBeenCalledWith('name');
    });

    it('shows sort indicator when column is sorted', () => {
        renderWithAppContext(<RecipeView {...defaultProps} viewMode="table" sortConfig={{key: 'name', direction: 'asc'}}/>);

        const nameHeader = screen.getByRole('columnheader', {name: /Name/i});
        expect(nameHeader.className).toContain('text-indigo');
    });
});

