import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => { }
    })
});

// Mock localStorage
const localStorageMock = {
    getItem: (key) => null,
    setItem: (key, value) => { },
    removeItem: (key) => { },
    clear: () => { }
};

global.localStorage = localStorageMock;
