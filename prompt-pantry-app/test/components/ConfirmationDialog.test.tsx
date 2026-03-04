import {fireEvent, render, screen} from '@testing-library/react';
import {ConfirmationDialog} from '../../src/components/ConfirmationDialog';
import {describe, expect, it, vi} from 'vitest';

describe('ConfirmationDialog', () => {
    it('renders correctly with given props', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(
            <ConfirmationDialog
                title="Confirm Action"
                message="Are you sure?"
                onConfirm={onConfirm}
                onCancel={onCancel}
            />
        );

        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
        expect(screen.getByText('Confirm')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button is clicked', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(
            <ConfirmationDialog
                title="Title"
                message="Message"
                onConfirm={onConfirm}
                onCancel={onCancel}
            />
        );

        fireEvent.click(screen.getByText('Confirm'));
        expect(onConfirm).toHaveBeenCalled();
    });

    it('calls onCancel when cancel button is clicked', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(
            <ConfirmationDialog
                title="Title"
                message="Message"
                onConfirm={onConfirm}
                onCancel={onCancel}
            />
        );

        fireEvent.click(screen.getByText('Cancel'));
        expect(onCancel).toHaveBeenCalled();
    });

    it('calls onCancel when Escape key is pressed', () => {
        const onCancel = vi.fn();
        render(
            <ConfirmationDialog
                title="Title"
                message="Message"
                onConfirm={() => {
                }}
                onCancel={onCancel}
            />
        );

        fireEvent.keyDown(window, {key: 'Escape'});
        expect(onCancel).toHaveBeenCalled();
    });

    it('renders with danger variant', () => {
        render(
            <ConfirmationDialog
                title="Danger"
                message="Danger Message"
                onConfirm={() => {
                }}
                onCancel={() => {
                }}
                variant="danger"
            />
        );
        // Just verify it renders, checking classes is brittle but variant is used.
        expect(screen.getByText('Danger')).toBeInTheDocument();
    });

    it('does not render cancel button when cancelLabel is "none"', () => {
        render(
            <ConfirmationDialog
                title="Title"
                message="Message"
                onConfirm={() => {
                }}
                onCancel={() => {
                }}
                cancelLabel="none"
            />
        );
        expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
});
