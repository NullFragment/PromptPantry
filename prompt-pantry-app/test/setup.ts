import '@testing-library/jest-dom/vitest';
import {vi} from 'vitest';

const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

if (!global.fetch || vi.isMockFunction(global.fetch)) {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
        const responseData = url === '/api/me' ? {username: 'testuser'} : [];
        return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(JSON.stringify(responseData)),
            json: () => Promise.resolve(responseData)
        });
    }) as any);
}
