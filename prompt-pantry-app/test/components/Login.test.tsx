import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {Login} from '../../src/components/Login';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import React from 'react';

describe('Login', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            if (url === '/api/registration-status') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({registrationEnabled: true}),
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({}),
            });
        }));
    });

    it('shows register button when registration is enabled', async () => {
        render(<Login onLogin={() => {
        }}/>);

        await waitFor(() => {
            expect(screen.getByText(/Don't have an account\? Register/i)).toBeInTheDocument();
        });
    });

    it('hides register button when registration is disabled', async () => {
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            if (url === '/api/registration-status') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({registrationEnabled: false}),
                });
            }
            return Promise.resolve({ok: true, json: () => Promise.resolve({})});
        }));

        render(<Login onLogin={() => {
        }}/>);

        await waitFor(() => {
            expect(screen.queryByText(/Don't have an account\? Register/i)).not.toBeInTheDocument();
            expect(screen.getByText(/Account creation is currently disabled/i)).toBeInTheDocument();
        });
    });

    it('can switch to registration mode and back', async () => {
        render(<Login onLogin={() => {
        }}/>);

        const toggleButton = await screen.findByText(/Don't have an account\? Register/i);
        fireEvent.click(toggleButton);

        expect(screen.getByText('Create an Account')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Register'})).toBeInTheDocument();

        fireEvent.click(screen.getByText(/Already have an account\? Sign in/i));
        expect(screen.getByText('Login to PromptPantry')).toBeInTheDocument();
    });
});
