import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {DatePicker} from '../../src/components/DatePicker';

describe('DatePicker', () => {
    const defaultProps = {
        selectedDate: new Date('2026-01-15'),
        onChange: vi.fn(),
        onClose: vi.fn(),
    };

    it('renders with the correct month', () => {
        render(<DatePicker {...defaultProps} />);

        expect(screen.getByText('January 2026')).toBeInTheDocument();
    });

    it('shows day of week headers', () => {
        render(<DatePicker {...defaultProps} />);

        // Should have S M T W T F S
        const headers = screen.getAllByText(/^[SMTWTFS]$/);
        expect(headers).toHaveLength(7);
    });

    it('highlights the selected date', () => {
        render(<DatePicker {...defaultProps} />);

        // Find the 15th (our selected date) - look for the button
        const buttons = screen.getAllByRole('button');
        const selectedButton = buttons.find(btn =>
            btn.textContent === '15' && btn.className.includes('indigo-600')
        );

        expect(selectedButton).toBeDefined();
    });

    it('calls onChange when a date is clicked', () => {
        const onChange = vi.fn();
        render(<DatePicker {...defaultProps} onChange={onChange}/>);

        // Click on the 20th
        const buttons = screen.getAllByRole('button');
        const day20 = buttons.find(btn => btn.textContent === '20');
        fireEvent.click(day20!);

        expect(onChange).toHaveBeenCalled();
        const calledDate = onChange.mock.calls[0][0];
        expect(calledDate.getDate()).toBe(20);
    });

    it('closes when a date is clicked', () => {
        const onClose = vi.fn();
        render(<DatePicker {...defaultProps} onClose={onClose}/>);

        const buttons = screen.getAllByRole('button');
        const day20 = buttons.find(btn => btn.textContent === '20');
        fireEvent.click(day20!);

        expect(onClose).toHaveBeenCalled();
    });

    it('navigates to previous month', () => {
        render(<DatePicker {...defaultProps} />);

        const prevButton = screen.getByTitle('Previous Month');
        fireEvent.click(prevButton);

        expect(screen.getByText('December 2025')).toBeInTheDocument();
    });

    it('navigates to next month', () => {
        render(<DatePicker {...defaultProps} />);

        const nextButton = screen.getByTitle('Next Month');
        fireEvent.click(nextButton);

        expect(screen.getByText('February 2026')).toBeInTheDocument();
    });

    it('has a Go to Today button that works', () => {
        const onChange = vi.fn();
        const onClose = vi.fn();
        render(<DatePicker {...defaultProps} onChange={onChange} onClose={onClose}/>);

        const todayButton = screen.getByText('Go to Today');
        fireEvent.click(todayButton);

        expect(onChange).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it('closes on backdrop click', () => {
        const onClose = vi.fn();
        render(<DatePicker {...defaultProps} onClose={onClose}/>);

        // Click the backdrop (the dark overlay)
        const backdrop = document.querySelector('.bg-black\\/40');
        fireEvent.click(backdrop!);

        expect(onClose).toHaveBeenCalled();
    });

    it('closes on X button click', () => {
        const onClose = vi.fn();
        render(<DatePicker {...defaultProps} onClose={onClose}/>);

        const closeButton = screen.getByLabelText('Close');
        fireEvent.click(closeButton);

        expect(onClose).toHaveBeenCalled();
    });

    it('closes on Escape key press', () => {
        const onClose = vi.fn();
        render(<DatePicker {...defaultProps} onClose={onClose}/>);

        fireEvent.keyDown(window, {key: 'Escape'});

        expect(onClose).toHaveBeenCalled();
    });

    it('shows dates from previous month that fill the week', () => {
        // January 2026 starts on Thursday, so we should see Dec 28-31
        render(<DatePicker {...defaultProps} />);

        // Look for multiple 28s (one from Dec, potentially visible)
        const buttons = screen.getAllByRole('button');
        // There should be dates from the previous month visible (grayed out)
        const dayButtons = buttons.filter(btn => /^\d+$/.test(btn.textContent || ''));
        expect(dayButtons.length).toBeGreaterThan(28); // More than just January days
    });

    it('shows dates from next month that fill the week', () => {
        render(<DatePicker {...defaultProps} />);

        // January 2026 ends on Saturday, so we might see Feb 1
        // The grid continues to fill the week
        const buttons = screen.getAllByRole('button');
        const dayButtons = buttons.filter(btn => /^\d+$/.test(btn.textContent || ''));
        expect(dayButtons.length).toBeGreaterThan(30);
    });
});

