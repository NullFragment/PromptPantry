/**
 * Shared test utilities for hook/component tests that use fetch mocks.
 * apiRequest uses res.text() (not res.json()), so mocks must provide text().
 */

import React, {type ReactElement} from 'react';
import {render, type RenderOptions} from '@testing-library/react';
import {AppProvider, type AppContextValue} from '../src/contexts/AppContext';

const defaultAppContext: AppContextValue = {
    userTier: 'Admin',
    canEdit: true,
    unitSystem: 'metric',
    advancedMode: false,
    darkMode: true,
};

export function renderWithAppContext(
    ui: ReactElement,
    {appContext, ...renderOptions}: RenderOptions & {appContext?: Partial<AppContextValue>} = {}
) {
    const value = {...defaultAppContext, ...appContext};
    function Wrapper({children}: {children: React.ReactNode}) {
        return React.createElement(AppProvider, {value}, children);
    }
    return render(ui, {wrapper: Wrapper, ...renderOptions});
}

export function mockFetchResponse(data: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(JSON.stringify(data)),
        json: () => Promise.resolve(data)
    };
}

export function mockFetchError(error: string | Record<string, unknown>, status = 500) {
    const body = typeof error === 'string' ? { error } : error;
    return {
        ok: false,
        status,
        statusText: typeof error === 'string' ? error : 'Error',
        text: () => Promise.resolve(JSON.stringify(body)),
        json: () => Promise.resolve(body)
    };
}
