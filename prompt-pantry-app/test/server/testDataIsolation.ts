import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import os from 'os';
import {createApp} from '../../serverFactory.js';
import type {Express} from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SOURCE_DATA_DIR = path.join(__dirname, '../../../data');

export interface TestEnvironment {
    app: Express;
    dataDir: string;
    files: {
        usersFile: string;
        settingsFile: string;
        recipesFile: string;
        participantsFile: string;
        mealPlanFile: string;
        multiWeekFile: string;
        ingredientsFile: string;
        storeSectionsFile: string;
    };
    cleanup: () => void;
}

/**
 * Creates an isolated test environment with its own data directory and server instance.
 * The data directory is initialized as a copy of the main data folder.
 * @param testName - Unique name for this test suite (used in temp directory name)
 */
export function createTestEnvironment(testName: string): TestEnvironment {
    // Create a unique temp directory for this test suite
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `recipe-test-${testName}-`));

    // Copy all files from the source data directory
    if (fs.existsSync(SOURCE_DATA_DIR)) {
        const files = fs.readdirSync(SOURCE_DATA_DIR);
        for (const file of files) {
            const srcPath = path.join(SOURCE_DATA_DIR, file);
            const destPath = path.join(tempDir, file);
            if (fs.statSync(srcPath).isFile()) {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    // Create the app with the isolated data directory
    const app = createApp(tempDir);

    return {
        app,
        dataDir: tempDir,
        files: {
            usersFile: path.join(tempDir, 'users.json'),
            settingsFile: path.join(tempDir, 'settings.json'),
            recipesFile: path.join(tempDir, 'recipes.json'),
            participantsFile: path.join(tempDir, 'participants.json'),
            mealPlanFile: path.join(tempDir, 'mealPlan.json'),
            multiWeekFile: path.join(tempDir, 'multiWeeklyCookPlan.json'),
            ingredientsFile: path.join(tempDir, 'ingredients.json'),
            storeSectionsFile: path.join(tempDir, 'storeSections.json'),
        },
        cleanup: () => {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, {recursive: true, force: true});
            }
        },
    };
}

/**
 * Helper to write JSON data to a file in the test environment
 */
export function writeTestFile(filePath: string, data: unknown): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Helper to read JSON data from a file in the test environment
 */
export function readTestFile<T>(filePath: string): T {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

/**
 * Helper to delete a file in the test environment
 */
export function deleteTestFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

