import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {describe, expect, it, vi, beforeEach} from 'vitest';
import {AdminPanel} from '../../src/components/AdminPanel';

const mockUsers = [
    {username: 'admin', tier: 'Admin'},
    {username: 'editor', tier: 'Editor'},
    {username: 'viewer', tier: 'Viewer'}
];

const mockAuditResult = {
    summary: {
        totalRecipes: 3,
        recipesWithIssues: 2,
        totalUnlinked: 1,
        totalBrokenLinks: 0,
        totalMissingMeasurements: 1,
        totalSchemaInvalid: 0,
    },
    recipes: [
        {recipeName: 'Pasta', issues: [{type: 'unlinked', ingredient: '"Garlic"', detail: 'No linked ingredient definition'}]},
        {recipeName: 'Salad', issues: [{type: 'missing_measurement', ingredient: '"Lettuce"', detail: 'No quantity/measure defined'}]},
    ],
};

const defaultMacroLimits = {
    proteinPercentMin: 0,
    proteinPercentMax: 100,
    fatPercentMin: 0,
    fatPercentMax: 100,
    calorieDeficitMax: 25
};

const adminPanelProps = {
    registrationEnabled: true as boolean | null,
    toggleRegistration: () => {},
    advancedMode: false,
    setAdvancedMode: () => {},
    macroLimits: defaultMacroLimits,
    setMacroLimits: () => {},
    fetchSettings: () => Promise.resolve()
};

const mockFetchResponse = (data: unknown, status = 200) => Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
});

describe('AdminPanel', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn((url: string, options?: { method?: string; body?: string }) => {
            if (url === '/api/users' && (!options || options.method === undefined || options.method === 'GET')) {
                return mockFetchResponse(mockUsers);
            }
            if (url === '/api/users' && options?.method === 'POST') {
                const body = JSON.parse(options.body as string);
                return mockFetchResponse({username: body.username, tier: body.tier});
            }
            if (url.startsWith('/api/users/') && options?.method === 'PUT') {
                return mockFetchResponse({});
            }
            if (url.startsWith('/api/users/') && options?.method === 'DELETE') {
                return Promise.resolve({
                    ok: true,
                    status: 204,
                    text: () => Promise.resolve(''),
                });
            }
            if (url === '/api/recipes/audit') {
                return mockFetchResponse(mockAuditResult);
            }
            return mockFetchResponse({});
        }));
    });

    it('renders settings controls', () => {
        render(<AdminPanel {...adminPanelProps} />);

        expect(screen.getByText(/Admin Settings/i)).toBeInTheDocument();
        expect(screen.getByText(/Account Registration/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Advanced Mode/i).length).toBeGreaterThan(0);
    });

    it('toggles registration', () => {
        const toggle = vi.fn();
        render(<AdminPanel {...adminPanelProps} toggleRegistration={toggle} />);

        fireEvent.click(screen.getByText(/Disable Registration/i));
        expect(toggle).toHaveBeenCalled();
    });

    it('toggles advanced mode', () => {
        const setAdvancedMode = vi.fn();
        render(<AdminPanel {...adminPanelProps} setAdvancedMode={setAdvancedMode} />);

        fireEvent.click(screen.getByText(/Enable Advanced Mode/i));
        expect(setAdvancedMode).toHaveBeenCalledWith(true);
    });

    it('displays user management section', async () => {
        render(<AdminPanel {...adminPanelProps} />);

        expect(screen.getByText(/User Management/i)).toBeInTheDocument();
        expect(screen.getByText(/Add User/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('admin')).toBeInTheDocument();
            expect(screen.getByText('editor')).toBeInTheDocument();
            expect(screen.getByText('viewer')).toBeInTheDocument();
        });
    });

    it('displays users in a table with tier selectors', async () => {
        render(<AdminPanel {...adminPanelProps} />);

        await waitFor(() => {
            expect(screen.getByText('admin')).toBeInTheDocument();
        });

        const tierSelectors = screen.getAllByRole('combobox');
        expect(tierSelectors.length).toBe(3);
    });

    it('opens create user modal when Add User is clicked', async () => {
        render(<AdminPanel {...adminPanelProps} />);

        fireEvent.click(screen.getByText(/Add User/i));

        expect(screen.getByText(/Create New User/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Tier/i)).toBeInTheDocument();
    });

    it('can create a new user', async () => {
        render(<AdminPanel {...adminPanelProps} />);

        fireEvent.click(screen.getByText(/Add User/i));

        fireEvent.change(screen.getByLabelText(/Username/i), {target: {value: 'newuser'}});
        fireEvent.change(screen.getByLabelText(/Password/i), {target: {value: 'password123'}});
        fireEvent.change(screen.getByLabelText(/Tier/i), {target: {value: 'Editor'}});

        fireEvent.click(screen.getByText(/Create User/i));

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({username: 'newuser', password: 'password123', tier: 'Editor'})
            }));
        });
    });

    it('can update user tier', async () => {
        render(<AdminPanel {...adminPanelProps} />);

        await waitFor(() => {
            expect(screen.getByText('viewer')).toBeInTheDocument();
        });

        const tierSelector = screen.getByLabelText(/Change tier for viewer/i);
        fireEvent.change(tierSelector, {target: {value: 'Editor'}});

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/api/users/viewer', expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({tier: 'Editor'})
            }));
        });
    });

    it('can delete a user after confirmation', async () => {
        render(<AdminPanel {...adminPanelProps} />);

        await waitFor(() => {
            expect(screen.getByText('viewer')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[2]); // Delete 'viewer'

        expect(screen.getByText(/Are you sure you want to delete user "viewer"\?/i)).toBeInTheDocument();

        // Find the Delete button in the confirmation dialog (it's styled differently)
        const confirmDeleteButton = screen.getAllByRole('button').find(btn =>
            btn.textContent === 'Delete' && btn.classList.contains('bg-red-600')
        );
        if (confirmDeleteButton) {
            fireEvent.click(confirmDeleteButton);
        }

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/api/users/viewer', expect.objectContaining({
                method: 'DELETE'
            }));
        });
    });

    it('can cancel user deletion', async () => {
        render(<AdminPanel {...adminPanelProps} />);

        await waitFor(() => {
            expect(screen.getByText('viewer')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[2]);

        expect(screen.getByText(/Are you sure you want to delete user "viewer"\?/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: /Cancel/i}));

        expect(screen.queryByText(/Are you sure you want to delete user "viewer"\?/i)).not.toBeInTheDocument();
    });

    it('can close create user modal', async () => {
        render(<AdminPanel {...adminPanelProps} />);

        fireEvent.click(screen.getByText(/Add User/i));
        expect(screen.getByText(/Create New User/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: /Cancel/i}));

        await waitFor(() => {
            expect(screen.queryByText(/Create New User/i)).not.toBeInTheDocument();
        });
    });

    it('renders the recipe audit section', () => {
        render(<AdminPanel {...adminPanelProps} />);
        expect(screen.getByText(/Recipe Data Audit/i)).toBeInTheDocument();
        expect(screen.getByText(/Run Audit/i)).toBeInTheDocument();
    });

    it('displays audit results after clicking Run Audit', async () => {
        render(<AdminPanel {...adminPanelProps} />);

        fireEvent.click(screen.getByText(/Run Audit/i));

        await waitFor(() => {
            expect(screen.getByText('3')).toBeInTheDocument(); // totalRecipes
            expect(screen.getByText('2')).toBeInTheDocument(); // recipesWithIssues
        });
        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.getByText('Salad')).toBeInTheDocument();
    });

    it('expands recipe issues on click', async () => {
        render(<AdminPanel {...adminPanelProps} />);

        fireEvent.click(screen.getByText(/Run Audit/i));

        await waitFor(() => {
            expect(screen.getByText('Pasta')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Pasta'));

        await waitFor(() => {
            expect(screen.getByText(/No linked ingredient definition/i)).toBeInTheDocument();
        });
    });

    it('shows success message when no issues found', async () => {
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            if (url === '/api/recipes/audit') {
                return mockFetchResponse({
                    summary: {totalRecipes: 5, recipesWithIssues: 0, totalUnlinked: 0, totalBrokenLinks: 0, totalMissingMeasurements: 0, totalSchemaInvalid: 0},
                    recipes: [],
                });
            }
            if (url === '/api/users') return mockFetchResponse(mockUsers);
            return mockFetchResponse({});
        }));

        render(<AdminPanel {...adminPanelProps} />);
        fireEvent.click(screen.getByText(/Run Audit/i));

        await waitFor(() => {
            expect(screen.getByText(/All recipes passed the audit/i)).toBeInTheDocument();
        });
    });
});
