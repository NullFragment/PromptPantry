import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NameAndSectionFields } from '../../../src/components/ingredients/NameAndSectionFields';
import type { StoreSectionDefinition } from '../../../src/types';

const mockStoreSections: StoreSectionDefinition[] = [
    { id: 'dairy-uuid', name: 'Dairy' },
    { id: 'meat-uuid', name: 'Meat' },
    { id: 'produce-uuid', name: 'Produce' },
];

const defaultProps = {
    name: '',
    onNameChange: vi.fn(),
    storeSectionId: '',
    onSelectSection: vi.fn(),
    storeSections: mockStoreSections,
    saveSection: vi.fn(),
    nameAutoFocus: false,
};

describe('NameAndSectionFields', () => {
    it('renders the section dropdown with existing options and Add new section option', () => {
        render(<NameAndSectionFields {...defaultProps} />);
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /add new section/i })).toBeInTheDocument();
    });

    it('shows NewSectionForm when "Add new section…" is selected', () => {
        render(<NameAndSectionFields {...defaultProps} />);
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '__new__' } });
        expect(screen.getByPlaceholderText(/section name/i)).toBeInTheDocument();
    });

    it('restores dropdown and calls onSelectSection on successful NewSectionForm submit', async () => {
        const bakerySection: StoreSectionDefinition = { id: 'bakery-uuid', name: 'Bakery' };
        const saveSection = vi.fn().mockResolvedValue({ success: true, section: bakerySection });
        const onSelectSection = vi.fn();
        render(
            <NameAndSectionFields
                {...defaultProps}
                saveSection={saveSection}
                onSelectSection={onSelectSection}
            />
        );
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '__new__' } });
        fireEvent.change(screen.getByPlaceholderText(/section name/i), {
            target: { value: 'Bakery' },
        });
        fireEvent.click(screen.getByRole('button', { name: /add/i }));
        await waitFor(() => expect(saveSection).toHaveBeenCalled());
        await waitFor(() => expect(onSelectSection).toHaveBeenCalledWith('bakery-uuid'));
        expect(screen.queryByPlaceholderText(/section name/i)).not.toBeInTheDocument();
    });

    it('keeps NewSectionForm open on failed submit', async () => {
        const saveSection = vi.fn().mockResolvedValue({ success: false, error: 'Server error' });
        render(
            <NameAndSectionFields
                {...defaultProps}
                saveSection={saveSection}
            />
        );
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '__new__' } });
        fireEvent.change(screen.getByPlaceholderText(/section name/i), {
            target: { value: 'Bakery' },
        });
        fireEvent.click(screen.getByRole('button', { name: /add/i }));
        await waitFor(() => expect(saveSection).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByText(/server error/i)).toBeInTheDocument());
        expect(screen.getByPlaceholderText(/section name/i)).toBeInTheDocument();
    });

    it('restores dropdown on cancel', () => {
        render(<NameAndSectionFields {...defaultProps} />);
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '__new__' } });
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(screen.queryByPlaceholderText(/section name/i)).not.toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
});
