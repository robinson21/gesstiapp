import React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';

const mount = () => {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
        console.warn("Root element not found, retrying...");
        setTimeout(mount, 50);
        return;
    }

    // Handle different export formats (named vs default) from CDN
    const createRoot = (ReactDOM as any).createRoot || (ReactDOM as any).default?.createRoot;

    if (!createRoot) {
        console.error("React DOM createRoot not found", ReactDOM);
        throw new Error("Failed to initialize React");
    }

    const root = createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
};

// Ensure DOM is ready before mounting
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
} else {
    mount();
}