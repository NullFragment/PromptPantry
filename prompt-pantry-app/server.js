/**
 * Main server entry point.
 * Uses serverFactory to create the Express app.
 * This file is for running the server in production/development.
 * For tests that need isolated data directories, import from serverFactory.js directly.
 */
import {createApp} from './serverFactory.js';

const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DATA_DIR;
const app = DATA_DIR ? createApp(DATA_DIR) : createApp();

if (process.env.NODE_ENV !== 'test') {
    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
        console.log(`Server running at http://${HOST}:${PORT}`);
    });
}

export default app;
