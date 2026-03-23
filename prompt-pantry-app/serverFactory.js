/**
 * Server Factory - Creates an Express app with a configurable data directory.
 * This enables tests to run with isolated data directories.
 */
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { createDataAccess } from './server/dataAccess.js';
import { createMiddleware } from './server/middleware.js';
import { registerAuthRoutes } from './server/authRoutes.js';
import { registerSettingsRoutes } from './server/settingsRoutes.js';
import { registerRecipeRoutes } from './server/recipeRoutes.js';
import { registerIngredientRoutes } from './server/ingredientRoutes.js';
import { registerStoreSectionRoutes } from './server/storeSectionRoutes.js';
import { registerMealPlanRoutes } from './server/mealPlanRoutes.js';
import { registerUserRoutes } from './server/userRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DATA_DIR = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(__dirname, '..', 'data');
const SCHEMAS_DIR = path.join(__dirname, '..', 'schemas');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required in production');
}
const JWT_SECRET =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'test' ? 'test-secret' : 'super-secret-key');

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
    console.warn('WARNING: Using default JWT secret. Set JWT_SECRET environment variable for security.');
}

// Schema setup (shared across all app instances)
const ajv = new Ajv({allErrors: true, strict: false});
addFormats(ajv);

const loadSchema = (name) => {
    const schemaPath = path.join(SCHEMAS_DIR, name);
    const raw = fs.readFileSync(schemaPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.$id) {
        parsed.$id = name;
    }
    return parsed;
};

const recipeSchema = loadSchema('recipe.schema.json');
ajv.addSchema(recipeSchema, recipeSchema.$id || 'recipe.schema.json');
const recipeValidator = ajv.getSchema(recipeSchema.$id || 'recipe.schema.json');
const participantSchema = loadSchema('participant.schema.json');
const participantValidator = ajv.compile(participantSchema);
const mealPlanSchema = loadSchema('mealPlan.schema.json');
ajv.addSchema(mealPlanSchema, mealPlanSchema.$id || 'mealPlan.schema.json');
const mealPlanValidator = ajv.getSchema(mealPlanSchema.$id || 'mealPlan.schema.json');
const multiWeeklyCookPlanSchema = loadSchema('multiWeeklyCookPlan.schema.json');
ajv.addSchema(multiWeeklyCookPlanSchema, multiWeeklyCookPlanSchema.$id || 'multiWeeklyCookPlan.schema.json');
const multiWeeklyCookPlanValidator = ajv.getSchema(multiWeeklyCookPlanSchema.$id || 'multiWeeklyCookPlan.schema.json');
const userSchema = loadSchema('user.schema.json');
const userValidator = ajv.compile(userSchema);
const ingredientSchema = loadSchema('ingredient.schema.json');
const ingredientValidator = ajv.compile(ingredientSchema);
const storeSectionSchema = loadSchema('storeSection.schema.json');
const storeSectionValidator = ajv.compile(storeSectionSchema);

const validators = {
    recipeValidator,
    participantValidator,
    mealPlanValidator,
    multiWeeklyCookPlanValidator,
    userValidator,
    ingredientValidator,
    storeSectionValidator
};

/**
 * Creates an Express app configured to use the specified data directory.
 * @param {string} dataDir - Path to the data directory (defaults to ../data)
 * @returns {express.Application} Configured Express application
 */
export function createApp(dataDir = DEFAULT_DATA_DIR) {
    const app = express();

    const isProduction = process.env.NODE_ENV === 'production';
    const allowedOrigins = isProduction
        ? (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    const corsOptions = {
        credentials: true,
        origin(origin, callback) {
            if (!origin) return callback(null, true);
            if (isProduction) {
                return callback(null, allowedOrigins.includes(origin));
            }
            if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
                return callback(null, true);
            }
            callback(null, false);
        }
    };
    app.use(cors(corsOptions));
    app.use(express.json({ limit: '1mb' }));
    app.use(cookieParser());

    // Rate limiting for auth endpoints
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests, please try again later' },
        skip: () => process.env.NODE_ENV === 'test'
    });

    // Initialize data access and middleware
    const dataAccess = createDataAccess(dataDir, validators);
    const middleware = createMiddleware(JWT_SECRET, dataAccess);

    // Shared context for route registrars
    const ctx = { dataAccess, middleware, validators, authLimiter, JWT_SECRET };

    // Register all route modules
    registerAuthRoutes(app, ctx);
    registerSettingsRoutes(app, ctx);
    registerStoreSectionRoutes(app, ctx);
    registerIngredientRoutes(app, ctx);
    registerRecipeRoutes(app, ctx);
    registerMealPlanRoutes(app, ctx);
    registerUserRoutes(app, ctx);

    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        console.error('Unhandled error:', err);
        res.status(500).json({ error: 'Internal server error' });
    });

    // Serve static files in production
    const distPath = path.join(__dirname, 'dist');
    if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('/{*path}', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    // Purge invalid users on app creation (one-time startup cleanup)
    dataAccess.purgeInvalidUsers();

    return app;
}

// Default export: Create app with default data directory
const defaultApp = createApp();
export default defaultApp;

