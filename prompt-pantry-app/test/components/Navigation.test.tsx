import {describe, expect, it, vi} from 'vitest';
import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {Navigation} from '../../src/components/Navigation';
import {renderWithAppContext} from '../testHelpers';
import {AppProvider, type AppContextValue} from '../../src/contexts/AppContext';

const baseContext: AppContextValue = {
    userTier: 'Admin',
    canEdit: true,
    unitSystem: 'metric',
    advancedMode: false,
    darkMode: true,
};

describe('Navigation', () => {
    const defaultProps = {
        view: 'recipes' as const,
        setView: vi.fn(),
        setDarkMode: vi.fn(),
        setUnitSystem: vi.fn(),
        onLogout: vi.fn(),
    };

    it('renders all navigation buttons', () => {
        renderWithAppContext(<Navigation {...defaultProps} />);

        expect(screen.getByRole('button', {name: 'Recipes'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Plan Overview'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Weekly Planner'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Shopping List'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Participants'})).toBeInTheDocument();
    });

    it('highlights current view', () => {
        renderWithAppContext(<Navigation {...defaultProps} view="calendar"/>);

        const calendarButton = screen.getByRole('button', {name: 'Plan Overview'});
        expect(calendarButton.className).toContain('nav-button-active');
    });

    it('calls setView when clicking navigation buttons', () => {
        const setView = vi.fn();
        renderWithAppContext(<Navigation {...defaultProps} setView={setView}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Plan Overview'}));
        expect(setView).toHaveBeenCalledWith('calendar');

        fireEvent.click(screen.getByRole('button', {name: 'Weekly Planner'}));
        expect(setView).toHaveBeenCalledWith('weekly');

        fireEvent.click(screen.getByRole('button', {name: 'Shopping List'}));
        expect(setView).toHaveBeenCalledWith('shopping');

        fireEvent.click(screen.getByRole('button', {name: 'Participants'}));
        expect(setView).toHaveBeenCalledWith('participants');
    });

    it('toggles dark mode', () => {
        const setDarkMode = vi.fn();
        renderWithAppContext(
            <Navigation {...defaultProps} setDarkMode={setDarkMode}/>,
            {appContext: {darkMode: false}}
        );

        const themeButton = screen.getByTitle(/Switch to Dark Mode/i);
        fireEvent.click(themeButton);

        expect(setDarkMode).toHaveBeenCalledWith(true);
    });

    it('shows correct icon for dark mode', () => {
        const {rerender} = render(
            <AppProvider value={{...baseContext, darkMode: false}}>
                <Navigation {...defaultProps}/>
            </AppProvider>
        );
        expect(screen.getByTitle(/Switch to Dark Mode/i)).toBeInTheDocument();

        rerender(
            <AppProvider value={{...baseContext, darkMode: true}}>
                <Navigation {...defaultProps}/>
            </AppProvider>
        );
        expect(screen.getByTitle(/Switch to Light Mode/i)).toBeInTheDocument();
    });

    it('shows unit system toggles', () => {
        renderWithAppContext(<Navigation {...defaultProps} />);

        expect(screen.getByRole('button', {name: /met/i})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /imp/i})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: /both/i})).toBeInTheDocument();
    });

    it('changes unit system when clicking toggles', () => {
        const setUnitSystem = vi.fn();
        renderWithAppContext(<Navigation {...defaultProps} setUnitSystem={setUnitSystem}/>);

        fireEvent.click(screen.getByRole('button', {name: /imp/i}));
        expect(setUnitSystem).toHaveBeenCalledWith('imperial');

        fireEvent.click(screen.getByRole('button', {name: /both/i}));
        expect(setUnitSystem).toHaveBeenCalledWith('both');

        fireEvent.click(screen.getByRole('button', {name: /met/i}));
        expect(setUnitSystem).toHaveBeenCalledWith('metric');
    });

    it('highlights active unit system', () => {
        const {rerender} = render(
            <AppProvider value={{...baseContext, unitSystem: 'metric'}}>
                <Navigation {...defaultProps}/>
            </AppProvider>
        );

        const metricButton = screen.getByRole('button', {name: /met/i});
        expect(metricButton.className).toContain('pill-toggle-active');

        rerender(
            <AppProvider value={{...baseContext, unitSystem: 'imperial'}}>
                <Navigation {...defaultProps}/>
            </AppProvider>
        );
        const imperialButton = screen.getByRole('button', {name: /imp/i});
        expect(imperialButton.className).toContain('pill-toggle-active');
    });

    it('renders app logo/title', () => {
        renderWithAppContext(<Navigation {...defaultProps} />);

        expect(screen.getByText('PromptPantry')).toBeInTheDocument();
    });

    it('shows Recipes button for recipe manager', () => {
        renderWithAppContext(<Navigation {...defaultProps} />);

        expect(screen.getByRole('button', {name: 'Recipes'})).toBeInTheDocument();
    });

    it('renders logout button', () => {
        renderWithAppContext(<Navigation {...defaultProps} />);
        expect(screen.getByTitle('Logout')).toBeInTheDocument();
    });

    it('shows Admin tab only for admins', () => {
        const {rerender} = render(
            <AppProvider value={{...baseContext, userTier: 'Admin'}}>
                <Navigation {...defaultProps} />
            </AppProvider>
        );
        expect(screen.getByRole('button', {name: 'Admin'})).toBeInTheDocument();

        rerender(
            <AppProvider value={{...baseContext, userTier: 'Viewer', canEdit: false}}>
                <Navigation {...defaultProps} />
            </AppProvider>
        );
        expect(screen.queryByRole('button', {name: 'Admin'})).not.toBeInTheDocument();
    });

    it('navigates to admin view when clicking Admin tab', () => {
        const setView = vi.fn();
        renderWithAppContext(<Navigation {...defaultProps} setView={setView} />);

        fireEvent.click(screen.getByRole('button', {name: 'Admin'}));
        expect(setView).toHaveBeenCalledWith('admin');
    });
});
