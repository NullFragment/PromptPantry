import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NewSectionForm } from '../../../src/components/ingredients/NewSectionForm';

describe('NewSectionForm', () => {
    it('renders emoji input and name input', () => {
        render(
            <NewSectionForm
                existingSections={[]}
                onSave={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByPlaceholderText(/emoji/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/section name/i)).toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', () => {
        const onCancel = vi.fn();
        render(
            <NewSectionForm existingSections={[]} onSave={vi.fn()} onCancel={onCancel} />
        );
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('shows validation error and does not call onSave when name is empty', async () => {
        const onSave = vi.fn();
        render(
            <NewSectionForm existingSections={[]} onSave={onSave} onCancel={vi.fn()} />
        );
        fireEvent.click(screen.getByRole('button', { name: /add/i }));
        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    it('shows duplicate error and does not call onSave when name matches existing section', async () => {
        const onSave = vi.fn();
        render(
            <NewSectionForm
                existingSections={['Produce']}
                onSave={onSave}
                onCancel={vi.fn()}
            />
        );
        fireEvent.change(screen.getByPlaceholderText(/section name/i), {
            target: { value: 'produce' },
        });
        fireEvent.click(screen.getByRole('button', { name: /add/i }));
        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });

    it('calls onSave with name and emoji on confirm', async () => {
        const onSave = vi.fn().mockResolvedValue({ success: true });
        render(
            <NewSectionForm existingSections={[]} onSave={onSave} onCancel={vi.fn()} />
        );
        fireEvent.change(screen.getByPlaceholderText(/emoji/i), {
            target: { value: '🥦' },
        });
        fireEvent.change(screen.getByPlaceholderText(/section name/i), {
            target: { value: 'Produce' },
        });
        fireEvent.click(screen.getByRole('button', { name: /add/i }));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith('Produce', '🥦'));
    });

    it('disables confirm button while onSave is in flight', async () => {
        let resolve: (v: { success: boolean }) => void;
        const onSave = vi.fn().mockReturnValue(new Promise(r => { resolve = r; }));
        render(
            <NewSectionForm existingSections={[]} onSave={onSave} onCancel={vi.fn()} />
        );
        fireEvent.change(screen.getByPlaceholderText(/section name/i), {
            target: { value: 'Bulk' },
        });
        fireEvent.click(screen.getByRole('button', { name: /add/i }));
        await waitFor(() => expect(screen.getByRole('button', { name: /add/i })).toBeDisabled());
        resolve!({ success: true });
    });

    it('shows inline error when onSave returns failure', async () => {
        const onSave = vi.fn().mockResolvedValue({ success: false, error: 'Server rejected it' });
        render(
            <NewSectionForm existingSections={[]} onSave={onSave} onCancel={vi.fn()} />
        );
        fireEvent.change(screen.getByPlaceholderText(/section name/i), {
            target: { value: 'Produce' },
        });
        fireEvent.click(screen.getByRole('button', { name: /add/i }));
        await waitFor(() =>
            expect(screen.getByText(/server rejected it/i)).toBeInTheDocument()
        );
    });

    it('triggers confirm when Enter is pressed in the name input', async () => {
        const onSave = vi.fn().mockResolvedValue({ success: true });
        render(
            <NewSectionForm existingSections={[]} onSave={onSave} onCancel={vi.fn()} />
        );
        fireEvent.change(screen.getByPlaceholderText(/section name/i), {
            target: { value: 'Produce' },
        });
        fireEvent.keyDown(screen.getByPlaceholderText(/section name/i), { key: 'Enter' });
        await waitFor(() => expect(onSave).toHaveBeenCalledWith('Produce', ''));
    });
});
