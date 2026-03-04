import {fireEvent, screen} from '@testing-library/react';
import {Participants} from '../../src/components/Participants';
import {Participant} from '../../src/types';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderWithAppContext} from '../testHelpers';

const mockParticipants: Participant[] = [
    {
        name: 'Alice',
        maintenanceCalories: 2000,
        calorieDeficit: 10,
        proteinPercent: 25,
        carbsPercent: 50,
        fatPercent: 25
    }
];

describe('Participants', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            if (url === '/api/settings' || url === '/api/settings/registration') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({registrationEnabled: true, advancedMode: false}),
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({}),
            });
        }));
    });

    it('renders participant list', () => {
        renderWithAppContext(<Participants participants={mockParticipants} onSave={() => {
        }}/>);
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
        expect(screen.getByText('1800 kcal')).toBeInTheDocument();
    });

    it('can add a new participant', () => {
        const onSave = vi.fn();
        renderWithAppContext(<Participants participants={[]} onSave={onSave}/>);

        fireEvent.click(screen.getByText(/Add Participant/i));

        const nameInput = screen.getByPlaceholderText('Name');
        fireEvent.change(nameInput, {target: {value: 'Bob'}});

        fireEvent.click(screen.getByTitle('Save Changes'));

        expect(onSave).toHaveBeenCalled();
        const savedList = onSave.mock.calls[0][0];
        expect(savedList).toHaveLength(1);
        expect(savedList[0].name).toBe('Bob');
    });

    it('can edit an existing participant', () => {
        const onSave = vi.fn();
        renderWithAppContext(<Participants participants={mockParticipants} onSave={onSave}/>);

        fireEvent.click(screen.getByTitle('Edit Participant'));

        const nameInput = screen.getByDisplayValue('Alice');
        fireEvent.change(nameInput, {target: {value: 'Alice Edited'}});

        fireEvent.click(screen.getByTitle('Save Changes'));

        expect(onSave).toHaveBeenCalled();
        expect(onSave.mock.calls[0][0][0].name).toBe('Alice Edited');
    });

    it('can delete a participant after confirmation', () => {
        const onSave = vi.fn();
        renderWithAppContext(<Participants participants={mockParticipants} onSave={onSave}/>);

        fireEvent.click(screen.getByTitle('Edit Participant'));
        fireEvent.click(screen.getByTitle('Delete Participant'));

        expect(screen.getByText(/Are you sure you want to delete Alice\?/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Delete'));

        expect(onSave).toHaveBeenCalledWith([], false);
    });

    it('can revert changes while editing', () => {
        renderWithAppContext(<Participants participants={mockParticipants} onSave={() => {
        }}/>);

        fireEvent.click(screen.getByTitle('Edit Participant'));

        const nameInput = screen.getByDisplayValue('Alice');
        fireEvent.change(nameInput, {target: {value: 'Alice Changed'}});
        expect(screen.getByDisplayValue('Alice Changed')).toBeInTheDocument();

        fireEvent.click(screen.getByTitle('Revert Changes'));
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    });

    it('can discard all changes', () => {
        renderWithAppContext(<Participants participants={mockParticipants} onSave={() => {
        }}/>);

        fireEvent.click(screen.getByTitle('Edit Participant'));
        const nameInput = screen.getByDisplayValue('Alice');
        fireEvent.change(nameInput, {target: {value: 'Alice Changed'}});

        fireEvent.click(screen.getByText(/^Discard$/i));
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    });

    it('can save all changes', () => {
        const onSave = vi.fn();
        renderWithAppContext(<Participants participants={mockParticipants} onSave={onSave}/>);

        fireEvent.click(screen.getByTitle('Edit Participant'));
        const nameInput = screen.getByDisplayValue('Alice');
        fireEvent.change(nameInput, {target: {value: 'Alice Saved All'}});

        fireEvent.click(screen.getByText(/^Save$/i));
        expect(onSave).toHaveBeenCalled();
        expect(onSave.mock.calls[0][0][0].name).toBe('Alice Saved All');
    });

    it('automatically calculates carbs percentage when protein or fat changes', () => {
        renderWithAppContext(<Participants participants={mockParticipants} onSave={() => {
        }}/>);

        fireEvent.click(screen.getByTitle('Edit Participant'));

        const proteinInput = screen.getByLabelText(/Protein percentage/i);
        fireEvent.change(proteinInput, {target: {value: '30'}});

        // Alice had 25P, 25F, 50C. Now 30P, 25F -> 45C
        expect(screen.getByLabelText(/Carbs percentage/i)).toHaveTextContent('45%');
    });

    it('clamps values on blur', () => {
        renderWithAppContext(<Participants participants={mockParticipants} onSave={() => {
        }}/>);

        fireEvent.click(screen.getByTitle('Edit Participant'));

        const deficitInput = screen.getByLabelText(/Calorie deficit percentage/i);
        fireEvent.change(deficitInput, {target: {value: '50'}}); // Max is 25
        fireEvent.blur(deficitInput);

        expect(screen.getByLabelText(/Calorie deficit percentage/i)).toHaveValue(25);
    });

    it('can revert a new unsaved participant', () => {
        renderWithAppContext(<Participants participants={[]} onSave={() => {
        }}/>);

        fireEvent.click(screen.getByText(/Add Participant/i));
        expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();

        fireEvent.click(screen.getByTitle('Revert Changes'));
        expect(screen.queryByPlaceholderText('Name')).not.toBeInTheDocument();
    });

    it('can delete a new unsaved participant', () => {
        renderWithAppContext(<Participants participants={[]} onSave={() => {
        }}/>);

        fireEvent.click(screen.getByText(/Add Participant/i));
        fireEvent.click(screen.getByTitle('Delete Participant'));

        expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Delete'));

        expect(screen.queryByPlaceholderText('Name')).not.toBeInTheDocument();
    });

    it('can cancel deletion', () => {
        renderWithAppContext(<Participants participants={mockParticipants} onSave={() => {
        }}/>);

        fireEvent.click(screen.getByTitle('Edit Participant'));
        fireEvent.click(screen.getByTitle('Delete Participant'));

        expect(screen.getByText(/Are you sure you want to delete Alice\?/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Cancel'));

        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    });

    it('can select an icon from the picker', () => {
        const onSave = vi.fn();
        renderWithAppContext(<Participants participants={mockParticipants} onSave={onSave}/>);

        fireEvent.click(screen.getByTitle('Edit Participant'));

        const pickerToggle = screen.getByLabelText(/Toggle icon picker/i);
        fireEvent.click(pickerToggle);

        // Choose an emoji
        const emojiButton = screen.getByText('🥗');
        fireEvent.click(emojiButton);

        fireEvent.click(screen.getByTitle('Save Changes'));

        expect(onSave).toHaveBeenCalled();
        expect(onSave.mock.calls[0][0][0].icon).toBe('🥗');
    });
});
