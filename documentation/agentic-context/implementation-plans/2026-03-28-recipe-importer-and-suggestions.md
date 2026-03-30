# Recipe Importer & Suggestion Algorithm Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a URL-based recipe importer with HTML fallback, inline save validation with unlinked-ingredient blocking, and improvements to the suggestion algorithm in the recipe picker.

**Architecture:** Client-side parsing dispatches to framework-specific parsers (WPRM → Tasty Recipes → JSON-LD) after a server-side proxy fetches the page. Suggestion scoring is extracted to a pure utility so it can be tested and refined independently of the React component. Save validation runs client-side before the save request, displaying inline field errors without closing the modal.

**Tech Stack:** TypeScript, React, Express (CommonJS), Vitest, supertest, DOMParser (browser), node-fetch or built-in fetch (Node 18+)

**Design doc:** `documentation/agentic-context/agent-designs/2026-03-28-recipe-importer-design.md`

---

## Chunk 1: Foundation

### Task 1: Update .gitignore and extract test fixtures

**Files:**
- Modify: `.gitignore`
- Create: `prompt-pantry-app/test/fixtures/wprm-howsweeteats.html`
- Create: `prompt-pantry-app/test/fixtures/wprm-damndelicious.html`
- Create: `prompt-pantry-app/test/fixtures/tasty-recipes-gimmesomeoven.html`
- Create: `prompt-pantry-app/test/fixtures/jsonld-food-com.html`
- Create: `prompt-pantry-app/test/fixtures/jsonld-seriouseats.html`

- [ ] **Step 1: Add Recipes-to-scrape.txt to .gitignore**

Add to `.gitignore` (root level, alongside `prompt-pantry-app/`):

```
# Recipe scraping source data (large, not for version control)
Recipes-to-scrape.txt
```

- [ ] **Step 2: Extract WPRM fixture from Recipes-to-scrape.txt**

Open `Recipes-to-scrape.txt`. Find the `PAGE:` block for `https://www.howsweeteats.com/2021/08/chimichurri-grilled-chicken/`. Copy the `ELEMENT:` HTML content (just the `<div id="wprm-recipe-container-...">` block and everything inside it) into:

`prompt-pantry-app/test/fixtures/wprm-howsweeteats.html`

This file should be just the recipe card HTML, not a full page. Verify it starts with `<div id="wprm-recipe-container-`.

- [ ] **Step 3: Extract second WPRM fixture**

From `Recipes-to-scrape.txt`, find `https://damndelicious.net/2015/11/30/cajun-chicken-pasta/`. Extract the recipe card element into:

`prompt-pantry-app/test/fixtures/wprm-damndelicious.html`

- [ ] **Step 4: Extract Tasty Recipes fixture**

From `Recipes-to-scrape.txt`, find `https://www.gimmesomeoven.com/instant-pot-crispy-carnitas/`. Extract the recipe card element (starts with `<div id="tasty-recipes-`) into:

`prompt-pantry-app/test/fixtures/tasty-recipes-gimmesomeoven.html`

- [ ] **Step 5: Extract food.com fixture**

From `Recipes-to-scrape.txt`, find `https://www.food.com/recipe/spicy-beef-satay-with-peanut-sauce-190413`. Extract the element into:

`prompt-pantry-app/test/fixtures/jsonld-food-com.html`

- [ ] **Step 6: Extract Serious Eats fixture**

From `Recipes-to-scrape.txt`, find `https://www.seriouseats.com/spaghetti-cacio-e-pepe-recipe`. Extract the element into:

`prompt-pantry-app/test/fixtures/jsonld-seriouseats.html`

- [ ] **Step 7: Commit**

```bash
cd prompt-pantry-app
git add -p ../../.gitignore test/fixtures/
git commit -m "Add recipe importer test fixtures and gitignore scrape data"
```

---

### Task 2: Server-side scrape endpoint

**Files:**
- Create: `prompt-pantry-app/server/scrapeRoutes.js`
- Modify: `prompt-pantry-app/serverFactory.js`
- Test: `prompt-pantry-app/test/server/scrapeApi.test.ts`

- [ ] **Step 1: Write failing test**

Create `prompt-pantry-app/test/server/scrapeApi.test.ts`:

```ts
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestEnvironment, type TestEnvironment } from './testDataIsolation.js';

describe('GET /api/recipes/scrape', () => {
    let env: TestEnvironment;

    beforeAll(async () => {
        env = await createTestEnvironment();
    });

    afterAll(async () => {
        await env.cleanup();
    });

    it('returns 401 when unauthenticated', async () => {
        const res = await request(env.app)
            .get('/api/recipes/scrape?url=https://example.com');
        expect(res.status).toBe(401);
    });

    it('returns 400 when url param is missing', async () => {
        const res = await request(env.app)
            .get('/api/recipes/scrape')
            .set('Cookie', env.editorCookie);
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/url/i);
    });

    it('returns 400 when url is not http/https', async () => {
        const res = await request(env.app)
            .get('/api/recipes/scrape?url=javascript:alert(1)')
            .set('Cookie', env.editorCookie);
        expect(res.status).toBe(400);
    });

    it('returns 502 when the remote page cannot be fetched', async () => {
        const res = await request(env.app)
            .get('/api/recipes/scrape?url=https://this-domain-does-not-exist-xyz.com')
            .set('Cookie', env.editorCookie);
        expect(res.status).toBe(502);
        expect(res.body.error).toMatch(/fetch/i);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd prompt-pantry-app
npx vitest run test/server/scrapeApi.test.ts
```

Expected: FAIL — route does not exist yet (401 test may pass, others 404)

- [ ] **Step 3: Implement scrapeRoutes.js**

Create `prompt-pantry-app/server/scrapeRoutes.js`:

```js
export function registerScrapeRoutes(app, { authenticate, requireEditor }) {
    app.get('/api/recipes/scrape', authenticate, requireEditor, async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'url query parameter is required' });
        }

        // Only allow http/https to prevent SSRF via other schemes
        let parsed;
        try {
            parsed = new URL(url);
        } catch {
            return res.status(400).json({ error: 'Invalid url' });
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return res.status(400).json({ error: 'url must use http or https' });
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    // Polite scraping: identify ourselves and accept HTML
                    'User-Agent': 'Mozilla/5.0 (compatible; PromptPantry/1.0)',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                redirect: 'follow',
            });

            clearTimeout(timeout);

            if (!response.ok) {
                return res.status(502).json({
                    error: `Failed to fetch page: HTTP ${response.status}`,
                });
            }

            const html = await response.text();
            return res.json({ html, url });
        } catch (err) {
            if (err.name === 'AbortError') {
                return res.status(502).json({ error: 'Failed to fetch page: request timed out' });
            }
            return res.status(502).json({ error: `Failed to fetch page: ${err.message}` });
        }
    });
}
```

- [ ] **Step 4: Register in serverFactory.js**

In `prompt-pantry-app/serverFactory.js`, add alongside the other route registrations:

```js
import { registerScrapeRoutes } from './server/scrapeRoutes.js';
// ...existing imports...

// inside createServer(), alongside other registerXxxRoutes calls:
registerScrapeRoutes(app, { authenticate, requireEditor });
```

- [ ] **Step 5: Run tests**

```bash
cd prompt-pantry-app
npx vitest run test/server/scrapeApi.test.ts
```

Expected: All pass except the 502 test (network-dependent — skip if it takes too long in CI).

- [ ] **Step 6: Commit**

```bash
git add server/scrapeRoutes.js serverFactory.js test/server/scrapeApi.test.ts
git commit -m "Add server-side recipe scrape proxy endpoint"
```

---

## Chunk 2: Parsing Engine

### Task 3: Detection chain and WPRM parser

**Files:**
- Create: `prompt-pantry-app/src/utils/recipeImporter.ts`
- Test: `prompt-pantry-app/test/utils/recipeImporter.test.ts`
- Test: `prompt-pantry-app/test/utils/wprmParser.test.ts`

- [ ] **Step 1: Write detection chain tests**

Create `prompt-pantry-app/test/utils/recipeImporter.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { importRecipeFromHtml } from '../../src/utils/recipeImporter.js';

const fixture = (name: string) =>
    readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

describe('importRecipeFromHtml - detection', () => {
    it('throws when no recipe framework is found', () => {
        expect(() => importRecipeFromHtml('<html><body>no recipe here</body></html>'))
            .toThrow(/no recipe/i);
    });

    it('detects WPRM from fixture', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        expect(result.name).toBeTruthy();
        expect(result.ingredients).toBeDefined();
    });

    it('detects Tasty Recipes from fixture', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        expect(result.name).toBeTruthy();
    });

    it('defaults categories to ["Misc"] for all frameworks', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        expect(result.categories).toEqual(['Misc']);
    });

    it('defaults macros to zeros when not present', () => {
        const result = importRecipeFromHtml(fixture('wprm-damndelicious.html'));
        expect(result.macros).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });

    it('prepends "Imported from: <url>" to notes when sourceUrl is provided', () => {
        const result = importRecipeFromHtml(
            fixture('wprm-howsweeteats.html'),
            'https://example.com/recipe'
        );
        expect(result.notes).toMatch(/^Imported from: https:\/\/example\.com\/recipe/);
    });
});
```

- [ ] **Step 2: Write WPRM parser tests**

Create `prompt-pantry-app/test/utils/wprmParser.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { importRecipeFromHtml } from '../../src/utils/recipeImporter.js';

const fixture = (name: string) =>
    readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

describe('WPRM parser', () => {
    it('extracts recipe name', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        expect(typeof result.name).toBe('string');
        expect(result.name!.length).toBeGreaterThan(0);
    });

    it('extracts servings as a number', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        expect(typeof result.servings).toBe('number');
        expect(result.servings).toBeGreaterThan(0);
    });

    it('extracts prepTime and cookTime as numeric strings', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        expect(result.prepTime).toMatch(/^\d+$/);
        expect(result.cookTime).toMatch(/^\d+$/);
    });

    it('extracts ingredients with quantity, measure, and name', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        const flat = Array.isArray(result.ingredients)
            ? result.ingredients.flat()
            : (result.ingredients as any[]).flatMap((g: any) => g.items ?? []);
        expect(flat.length).toBeGreaterThan(0);
        const first = flat[0] as any;
        expect(first.ingredient).toBeTruthy();
    });

    it('extracts instructions', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        const flat = Array.isArray(result.instructions)
            ? result.instructions
            : (result.instructions as any[]).flatMap((g: any) => g.steps ?? []);
        expect(flat.length).toBeGreaterThan(0);
    });

    it('extracts nutrition when present', () => {
        // howsweeteats has nutrition data
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        // If nutrition is present, at least calories should be non-zero
        // (skip assertion if the fixture doesn't have nutrition)
        if (result.macros!.calories > 0) {
            expect(result.macros!.calories).toBeGreaterThan(0);
        }
    });

    it('defaults macros to zeros when nutrition absent', () => {
        const result = importRecipeFromHtml(fixture('wprm-damndelicious.html'));
        expect(result.macros).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd prompt-pantry-app
npx vitest run test/utils/recipeImporter.test.ts test/utils/wprmParser.test.ts
```

Expected: FAIL — `recipeImporter.ts` does not exist yet

- [ ] **Step 4: Implement recipeImporter.ts with detection and WPRM parser**

Create `prompt-pantry-app/src/utils/recipeImporter.ts`:

```ts
import type { Recipe, Ingredient, IngredientGroup } from '../types';

type ParsedIngredient = Pick<Ingredient, 'ingredient'> & {
    quantity?: string;
    measure?: string;
};

export type ImportedRecipe = Partial<Recipe> & {
    macros: Recipe['macros'];
    categories: Recipe['categories'];
};

const DEFAULT_MACROS = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export function importRecipeFromHtml(html: string, sourceUrl?: string): ImportedRecipe {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (doc.querySelector('[id^="wprm-recipe-container"]')) {
        return parseWprm(doc, sourceUrl);
    }
    if (doc.querySelector('.tasty-recipes')) {
        return parseTastyRecipes(doc, sourceUrl);
    }
    const jsonLd = findRecipeJsonLd(doc);
    if (jsonLd) {
        return parseJsonLd(jsonLd, doc, sourceUrl);
    }

    throw new Error('No recipe found in the pasted content');
}

// ─── WPRM ────────────────────────────────────────────────────────────────────

function parseWprm(doc: Document, sourceUrl?: string): ImportedRecipe {
    const root = doc.querySelector('[id^="wprm-recipe-container"]')!;

    const name = root.querySelector('.wprm-recipe-name')?.textContent?.trim() ?? '';

    const servings = parseInt(root.getAttribute('data-servings') ?? '1', 10) || 1;
    const prepTime = root.querySelector('.wprm-recipe-prep_time-minutes')?.textContent?.trim() ?? '0';
    const cookTime = root.querySelector('.wprm-recipe-cook_time-minutes')?.textContent?.trim() ?? '0';

    // Ingredients — grouped
    const ingredientGroupEls = root.querySelectorAll('.wprm-recipe-ingredient-group');
    const ingredients: (ParsedIngredient | IngredientGroup)[] =
        ingredientGroupEls.length > 0
            ? Array.from(ingredientGroupEls).map(groupEl => {
                const groupName = groupEl.querySelector('.wprm-recipe-ingredient-group-name')?.textContent?.trim();
                const items = Array.from(groupEl.querySelectorAll('.wprm-recipe-ingredient')).map(parseWprmIngredientRow);
                return groupName ? { name: groupName, items } : items;
            }).flat()
            : Array.from(root.querySelectorAll('.wprm-recipe-ingredient')).map(parseWprmIngredientRow);

    // Instructions — grouped
    const instructionGroupEls = root.querySelectorAll('.wprm-recipe-instruction-group');
    const instructions: (string | { name: string; steps: string[] })[] =
        instructionGroupEls.length > 0
            ? Array.from(instructionGroupEls).map(groupEl => {
                const groupName = groupEl.querySelector('.wprm-recipe-instruction-group-name')?.textContent?.trim();
                const steps = Array.from(groupEl.querySelectorAll('.wprm-recipe-instruction-text')).map(el => el.textContent?.trim() ?? '').filter(Boolean);
                return groupName ? { name: groupName, steps } : steps;
            }).flat()
            : Array.from(root.querySelectorAll('.wprm-recipe-instruction-text')).map(el => el.textContent?.trim() ?? '').filter(Boolean);

    const tags = Array.from(root.querySelectorAll('.wprm-recipe-keyword')).map(el => el.textContent?.trim() ?? '').filter(Boolean);
    const notes = root.querySelector('.wprm-recipe-notes')?.textContent?.trim();
    const macros = parseWprmNutrition(root);

    return buildResult({ name, servings, prepTime, cookTime, ingredients, instructions, tags, notes, macros }, sourceUrl);
}

function parseWprmIngredientRow(el: Element): ParsedIngredient {
    const quantity = el.querySelector('.wprm-recipe-ingredient-amount')?.textContent?.trim();
    const measure = el.querySelector('.wprm-recipe-ingredient-unit')?.textContent?.trim();
    const ingredient = el.querySelector('.wprm-recipe-ingredient-name')?.textContent?.trim() ?? '';
    return { ingredient, ...(quantity ? { quantity } : {}), ...(measure ? { measure } : {}) };
}

function parseWprmNutrition(root: Element): Recipe['macros'] {
    const container = root.querySelector('.wprm-recipe-nutrition-container');
    if (!container) return { ...DEFAULT_MACROS };

    const getText = (label: string): number => {
        const els = container.querySelectorAll('[class*="wprm-nutrition"]');
        for (const el of Array.from(els)) {
            const labelEl = el.querySelector('[class*="wprm-nutrition-label"]');
            if (labelEl?.textContent?.toLowerCase().includes(label.toLowerCase())) {
                const value = el.querySelector('[class*="wprm-nutrition-value"]')?.textContent?.trim();
                return parseFloat(value ?? '0') || 0;
            }
        }
        return 0;
    };

    return {
        calories: getText('calorie'),
        protein: getText('protein'),
        carbs: getText('carbohydrate'),
        fat: getText('fat'),
    };
}

// ─── Tasty Recipes ────────────────────────────────────────────────────────────

function parseTastyRecipes(doc: Document, sourceUrl?: string): ImportedRecipe {
    const root = doc.querySelector('.tasty-recipes')!;

    const name = root.querySelector('.tasty-recipes-title')?.textContent?.trim() ?? '';
    const servingsText = root.querySelector('.tasty-recipes-yield [data-amount]')?.getAttribute('data-amount') ?? '1';
    const servings = parseInt(servingsText, 10) || 1;
    const prepTime = extractNumericTime(root.querySelector('.tasty-recipes-prep-time')?.textContent);
    const cookTime = extractNumericTime(root.querySelector('.tasty-recipes-cook-time')?.textContent);

    const ingredients = Array.from(root.querySelectorAll('.tasty-recipes-ingredients li'))
        .map(el => parseIngredientString(el.textContent?.trim() ?? ''))
        .filter(i => i.ingredient);

    const instructions = Array.from(root.querySelectorAll('.tasty-recipes-instructions li'))
        .map(el => el.textContent?.trim() ?? '')
        .filter(Boolean);

    const notes = root.querySelector('.tasty-recipes-notes')?.textContent?.trim();
    const macros = parseTastyNutrition(root);

    return buildResult({ name, servings, prepTime, cookTime, ingredients, instructions, notes, macros }, sourceUrl);
}

function parseTastyNutrition(root: Element): Recipe['macros'] {
    const container = root.querySelector('.tasty-recipes-nutrition');
    if (!container) return { ...DEFAULT_MACROS };
    const getText = (label: string): number => {
        const spans = container.querySelectorAll('span');
        for (const span of Array.from(spans)) {
            if (span.textContent?.toLowerCase().includes(label.toLowerCase())) {
                const next = span.nextElementSibling;
                return parseFloat(next?.textContent ?? '0') || 0;
            }
        }
        return 0;
    };
    return {
        calories: getText('calorie'),
        protein: getText('protein'),
        carbs: getText('carbohydrate'),
        fat: getText('fat'),
    };
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function findRecipeJsonLd(doc: Document): Record<string, unknown> | null {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of Array.from(scripts)) {
        try {
            const json = JSON.parse(script.textContent ?? '');
            if (json['@type'] === 'Recipe') return json;
            if (Array.isArray(json['@graph'])) {
                const found = json['@graph'].find((n: any) => n['@type'] === 'Recipe');
                if (found) return found;
            }
        } catch { /* ignore parse errors */ }
    }
    return null;
}

function parseJsonLd(json: Record<string, unknown>, doc: Document, sourceUrl?: string): ImportedRecipe {
    const name = String(json['name'] ?? '');
    const servings = parseLeadingInt(String(json['recipeYield'] ?? '1'));
    const prepTime = parseIso8601Duration(String(json['prepTime'] ?? ''));
    const cookTime = parseIso8601Duration(String(json['cookTime'] ?? ''));

    const ingredientStrings: string[] = Array.isArray(json['recipeIngredient']) ? json['recipeIngredient'] as string[] : [];
    const ingredients = ingredientStrings.map(s => parseIngredientString(s)).filter(i => i.ingredient);

    const instructionData = json['recipeInstructions'];
    const instructions: string[] = Array.isArray(instructionData)
        ? instructionData.map((step: any) => typeof step === 'string' ? step : (step.text ?? '')).filter(Boolean)
        : [];

    const keywordStr = String(json['keywords'] ?? '');
    const tags = keywordStr ? keywordStr.split(',').map(t => t.trim()).filter(Boolean) : [];

    const nutrition = json['nutrition'] as Record<string, unknown> | undefined;
    const macros = nutrition ? {
        calories: parseFloat(String(nutrition['calories'] ?? '0')) || 0,
        protein: parseFloat(String(nutrition['proteinContent'] ?? '0')) || 0,
        carbs: parseFloat(String(nutrition['carbohydrateContent'] ?? '0')) || 0,
        fat: parseFloat(String(nutrition['fatContent'] ?? '0')) || 0,
    } : { ...DEFAULT_MACROS };

    // Try to extract canonical URL from the page if sourceUrl not provided
    const resolvedUrl = sourceUrl
        ?? doc.querySelector('link[rel="canonical"]')?.getAttribute('href')
        ?? (doc.querySelector('meta[property="og:url"]') as HTMLMetaElement)?.content
        ?? undefined;

    return buildResult({ name, servings, prepTime, cookTime, ingredients, instructions, tags, macros }, resolvedUrl);
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function buildResult(
    fields: Partial<ImportedRecipe> & { macros: Recipe['macros'] },
    sourceUrl?: string
): ImportedRecipe {
    const notes = [
        sourceUrl ? `Imported from: ${sourceUrl}` : null,
        fields.notes ?? null,
    ].filter(Boolean).join('\n') || undefined;

    return {
        ...fields,
        notes,
        categories: ['Misc'],
        macros: fields.macros,
        prepTime: fields.prepTime ?? '0',
        cookTime: fields.cookTime ?? '0',
    };
}

function extractNumericTime(text: string | null | undefined): string {
    if (!text) return '0';
    const match = text.match(/\d+/);
    return match ? match[0] : '0';
}

function parseIso8601Duration(duration: string): string {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return '0';
    const hours = parseInt(match[1] ?? '0', 10);
    const minutes = parseInt(match[2] ?? '0', 10);
    return String(hours * 60 + minutes);
}

function parseLeadingInt(s: string): number {
    return parseInt(s.match(/\d+/)?.[0] ?? '1', 10) || 1;
}

export function parseIngredientString(s: string): ParsedIngredient {
    // Handle unicode fractions
    const normalized = s
        .replace(/½/g, '0.5').replace(/⅓/g, '0.33').replace(/⅔/g, '0.67')
        .replace(/¼/g, '0.25').replace(/¾/g, '0.75').trim();

    const match = normalized.match(/^([\d./\-\s]+)?\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)?)?\s+(.+)$/);
    if (!match) return { ingredient: s.trim() };

    return {
        quantity: match[1]?.trim() || undefined,
        measure: match[2]?.trim() || undefined,
        ingredient: match[3]?.trim() ?? s.trim(),
    };
}
```

- [ ] **Step 5: Run tests**

```bash
cd prompt-pantry-app
npx vitest run test/utils/recipeImporter.test.ts test/utils/wprmParser.test.ts
```

Expected: All pass (or skip nutrition assertion if fixture has no nutrition data).

- [ ] **Step 6: Commit**

```bash
git add src/utils/recipeImporter.ts test/utils/recipeImporter.test.ts test/utils/wprmParser.test.ts
git commit -m "Add recipe importer detection chain and WPRM parser"
```

---

### Task 4: Tasty Recipes and JSON-LD parsers

**Files:**
- Modify: `prompt-pantry-app/src/utils/recipeImporter.ts` (already created)
- Test: `prompt-pantry-app/test/utils/tastyRecipesParser.test.ts`
- Test: `prompt-pantry-app/test/utils/jsonLdParser.test.ts`

- [ ] **Step 1: Write Tasty Recipes parser tests**

Create `prompt-pantry-app/test/utils/tastyRecipesParser.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { importRecipeFromHtml } from '../../src/utils/recipeImporter.js';

const fixture = (name: string) =>
    readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

describe('Tasty Recipes parser', () => {
    it('extracts name', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        expect(result.name).toBeTruthy();
    });

    it('extracts servings from data-amount', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        expect(typeof result.servings).toBe('number');
        expect(result.servings).toBeGreaterThan(0);
    });

    it('extracts prep and cook time as numeric strings', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        expect(result.prepTime).toMatch(/^\d+$/);
        expect(result.cookTime).toMatch(/^\d+$/);
    });

    it('extracts at least one ingredient', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        expect((result.ingredients as any[]).length).toBeGreaterThan(0);
    });

    it('extracts at least one instruction', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        expect((result.instructions as any[]).length).toBeGreaterThan(0);
    });

    it('defaults categories to ["Misc"]', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        expect(result.categories).toEqual(['Misc']);
    });
});
```

- [ ] **Step 2: Write JSON-LD parser tests**

Create `prompt-pantry-app/test/utils/jsonLdParser.test.ts`:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { importRecipeFromHtml } from '../../src/utils/recipeImporter.js';

const fixture = (name: string) =>
    readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

describe('JSON-LD parser', () => {
    it('extracts name from food.com', () => {
        const result = importRecipeFromHtml(fixture('jsonld-food-com.html'));
        expect(result.name).toBeTruthy();
    });

    it('parses ISO 8601 duration to numeric string', () => {
        const html = `<script type="application/ld+json">
            {"@type":"Recipe","name":"Test","prepTime":"PT30M","cookTime":"PT1H15M",
             "recipeIngredient":["1 cup flour"],"recipeInstructions":["Mix"]}
        </script>`;
        const result = importRecipeFromHtml(html);
        expect(result.prepTime).toBe('30');
        expect(result.cookTime).toBe('75');
    });

    it('handles @graph nesting', () => {
        const html = `<script type="application/ld+json">
            {"@graph":[{"@type":"WebPage"},{"@type":"Recipe","name":"Nested","prepTime":"PT10M",
             "recipeIngredient":["1 egg"],"recipeInstructions":["Cook"]}]}
        </script>`;
        const result = importRecipeFromHtml(html);
        expect(result.name).toBe('Nested');
    });

    it('extracts keywords into tags', () => {
        const html = `<script type="application/ld+json">
            {"@type":"Recipe","name":"T","keywords":"chicken, easy, weeknight",
             "recipeIngredient":["1 chicken"],"recipeInstructions":["Cook"]}
        </script>`;
        const result = importRecipeFromHtml(html);
        expect(result.tags).toContain('chicken');
        expect(result.tags).toContain('easy');
    });

    it('extracts HowToStep instructions', () => {
        const html = `<script type="application/ld+json">
            {"@type":"Recipe","name":"T","recipeIngredient":["1 egg"],
             "recipeInstructions":[{"@type":"HowToStep","text":"Step 1"},{"@type":"HowToStep","text":"Step 2"}]}
        </script>`;
        const result = importRecipeFromHtml(html);
        expect(result.instructions).toEqual(['Step 1', 'Step 2']);
    });

    it('defaults categories to ["Misc"]', () => {
        const result = importRecipeFromHtml(fixture('jsonld-food-com.html'));
        expect(result.categories).toEqual(['Misc']);
    });
});
```

- [ ] **Step 3: Run tests**

```bash
cd prompt-pantry-app
npx vitest run test/utils/tastyRecipesParser.test.ts test/utils/jsonLdParser.test.ts
```

Expected: All pass (parsers are already implemented in Task 3).

- [ ] **Step 4: Commit**

```bash
git add test/utils/tastyRecipesParser.test.ts test/utils/jsonLdParser.test.ts
git commit -m "Add Tasty Recipes and JSON-LD parser tests"
```

---

### Task 5: Ingredient resolution

**Files:**
- Modify: `prompt-pantry-app/src/utils/recipeImporter.ts`
- Test: `prompt-pantry-app/test/utils/resolveIngredients.test.ts`

- [ ] **Step 1: Write failing tests**

Create `prompt-pantry-app/test/utils/resolveIngredients.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveIngredients } from '../../src/utils/recipeImporter.js';
import type { IngredientDefinition } from '../../src/types.js';

const library: IngredientDefinition[] = [
    { id: 'uuid-1', canonical: 'Chicken Breast', aliases: ['chicken', 'breast of chicken'], storeSection: 'Meat', containerSizes: [], conversions: [] },
    { id: 'uuid-2', canonical: 'All-Purpose Flour', aliases: ['flour', 'plain flour'], storeSection: 'Baking', containerSizes: [], conversions: [] },
    { id: 'uuid-3', canonical: 'Olive Oil', aliases: ['EVOO', 'extra virgin olive oil'], storeSection: 'Oils', containerSizes: [], conversions: [] },
];

describe('resolveIngredients', () => {
    it('matches by canonical name (case-insensitive)', () => {
        const result = resolveIngredients([{ ingredient: 'chicken breast' }], library);
        expect(result[0].ingredientId).toBe('uuid-1');
    });

    it('matches by alias (case-insensitive)', () => {
        const result = resolveIngredients([{ ingredient: 'plain flour' }], library);
        expect(result[0].ingredientId).toBe('uuid-2');
    });

    it('leaves ingredientId undefined when no match', () => {
        const result = resolveIngredients([{ ingredient: 'dragon fruit' }], library);
        expect(result[0].ingredientId).toBeUndefined();
    });

    it('preserves quantity and measure', () => {
        const result = resolveIngredients([{ ingredient: 'flour', quantity: '2', measure: 'cups' }], library);
        expect(result[0].quantity).toBe('2');
        expect(result[0].measure).toBe('cups');
    });

    it('handles an empty library gracefully', () => {
        const result = resolveIngredients([{ ingredient: 'salt' }], []);
        expect(result[0].ingredientId).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run test/utils/resolveIngredients.test.ts
```

Expected: FAIL — `resolveIngredients` not exported yet

- [ ] **Step 3: Add resolveIngredients to recipeImporter.ts**

Add at the bottom of `src/utils/recipeImporter.ts`:

```ts
import type { IngredientDefinition } from '../types';

type RawIngredient = { ingredient: string; quantity?: string; measure?: string };
type ResolvedIngredient = RawIngredient & { ingredientId?: string };

export function resolveIngredients(
    ingredients: RawIngredient[],
    library: IngredientDefinition[]
): ResolvedIngredient[] {
    return ingredients.map(ing => {
        const normalized = ing.ingredient.toLowerCase().trim();
        const match = library.find(def =>
            def.canonical.toLowerCase() === normalized ||
            (def.aliases ?? []).some(alias => alias.toLowerCase() === normalized)
        );
        return match ? { ...ing, ingredientId: match.id } : { ...ing };
    });
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run test/utils/resolveIngredients.test.ts
```

Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/recipeImporter.ts test/utils/resolveIngredients.test.ts
git commit -m "Add ingredient resolution with library matching"
```

---

## Chunk 3: Save Validation

### Task 6: Client-side save validation logic

**Files:**
- Create: `prompt-pantry-app/src/utils/recipeValidation.ts`
- Test: `prompt-pantry-app/test/utils/recipeValidation.test.ts`

- [ ] **Step 1: Write failing tests**

Create `prompt-pantry-app/test/utils/recipeValidation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validateRecipe, type ValidationError } from '../../src/utils/recipeValidation.js';

const validRecipe = {
    name: 'Test Recipe',
    categories: ['Dinner'],
    ingredients: [{ ingredient: 'Salt', ingredientId: 'uuid-1' }],
    instructions: ['Cook it'],
    macros: { calories: 100, protein: 10, carbs: 10, fat: 5 },
};

describe('validateRecipe', () => {
    it('returns no errors for a valid recipe', () => {
        expect(validateRecipe(validRecipe as any)).toHaveLength(0);
    });

    it('errors on empty name', () => {
        const errors = validateRecipe({ ...validRecipe, name: '' } as any);
        expect(errors.some(e => e.field === 'name')).toBe(true);
    });

    it('errors on missing categories', () => {
        const errors = validateRecipe({ ...validRecipe, categories: [] } as any);
        expect(errors.some(e => e.field === 'categories')).toBe(true);
    });

    it('errors on empty instructions', () => {
        const errors = validateRecipe({ ...validRecipe, instructions: [] } as any);
        expect(errors.some(e => e.field === 'instructions')).toBe(true);
    });

    it('errors on unlinked ingredient (missing ingredientId)', () => {
        const recipe = {
            ...validRecipe,
            ingredients: [
                { ingredient: 'Salt', ingredientId: 'uuid-1' },
                { ingredient: 'Mystery spice' }, // no ingredientId
            ],
        };
        const errors = validateRecipe(recipe as any);
        const unlinkedError = errors.find(e => e.field === 'ingredients');
        expect(unlinkedError).toBeDefined();
        expect(unlinkedError!.message).toMatch(/mystery spice/i);
    });

    it('errors on non-numeric macro', () => {
        const errors = validateRecipe({ ...validRecipe, macros: { calories: NaN, protein: 10, carbs: 10, fat: 5 } } as any);
        expect(errors.some(e => e.field === 'macros.calories')).toBe(true);
    });

    it('lists all unlinked ingredients in one error message', () => {
        const recipe = {
            ...validRecipe,
            ingredients: [
                { ingredient: 'Alpha' },
                { ingredient: 'Beta' },
            ],
        };
        const errors = validateRecipe(recipe as any);
        const msg = errors.find(e => e.field === 'ingredients')?.message ?? '';
        expect(msg).toMatch(/alpha/i);
        expect(msg).toMatch(/beta/i);
    });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run test/utils/recipeValidation.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement recipeValidation.ts**

Create `prompt-pantry-app/src/utils/recipeValidation.ts`:

```ts
import type { Recipe } from '../types';
import { flattenIngredients } from './recipeUtils';

export interface ValidationError {
    field: string;
    message: string;
}

export function validateRecipe(recipe: Partial<Recipe>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!recipe.name?.trim()) {
        errors.push({ field: 'name', message: 'Recipe name is required.' });
    }

    if (!recipe.categories?.length) {
        errors.push({ field: 'categories', message: 'At least one category is required.' });
    }

    const allIngredients = flattenIngredients(recipe.ingredients ?? []);
    const unlinked = allIngredients.filter(i => !i.ingredientId);
    if (unlinked.length > 0) {
        const names = unlinked.map(i => i.ingredient).join(', ');
        errors.push({
            field: 'ingredients',
            message: `The following ingredients must be linked before saving: ${names}.`,
        });
    }

    const instructions = Array.isArray(recipe.instructions)
        ? recipe.instructions.flatMap((i: any) => typeof i === 'string' ? [i] : (i.steps ?? []))
        : [];
    if (instructions.length === 0) {
        errors.push({ field: 'instructions', message: 'At least one instruction step is required.' });
    }

    const macros = recipe.macros ?? {};
    (['calories', 'protein', 'carbs', 'fat'] as const).forEach(key => {
        if (isNaN(Number(macros[key]))) {
            errors.push({ field: `macros.${key}`, message: `${key} must be a number.` });
        }
    });

    return errors;
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run test/utils/recipeValidation.test.ts
```

Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/recipeValidation.ts test/utils/recipeValidation.test.ts
git commit -m "Add client-side recipe validation with unlinked ingredient detection"
```

---

### Task 7: Wire save validation into RecipeEditForm

**Files:**
- Modify: `prompt-pantry-app/src/components/RecipeModal/RecipeEditForm.tsx`
- Modify: `prompt-pantry-app/src/components/RecipeModal/index.tsx`

*No new tests needed — validation logic is already tested. This task is UI wiring only.*

- [ ] **Step 1: Read current save flow in RecipeModal/index.tsx**

Read `prompt-pantry-app/src/components/RecipeModal/index.tsx` and identify:
- Where `handleSave` is defined
- How it calls the API
- How errors are currently shown

- [ ] **Step 2: Add validation to handleSave**

In `RecipeModal/index.tsx`, import `validateRecipe` and run it before the API call:

```ts
import { validateRecipe } from '../../utils/recipeValidation';

// Inside handleSave, before the fetch:
const validationErrors = validateRecipe(editedRecipe);
if (validationErrors.length > 0) {
    setSaveErrors(validationErrors); // new state — see Step 3
    return; // do NOT close modal or send request
}
setSaveErrors([]);
// ... existing save logic continues
```

- [ ] **Step 3: Add saveErrors state and error banner to RecipeModal/index.tsx**

```ts
const [saveErrors, setSaveErrors] = useState<ValidationError[]>([]);
```

Pass `saveErrors` down to `RecipeEditForm` as a prop.

- [ ] **Step 4: Add error banner and field highlights to RecipeEditForm**

In `RecipeEditForm.tsx`, accept `saveErrors: ValidationError[]` prop.

Add a red error banner at the top of the form when `saveErrors` has entries:

```tsx
{saveErrors.length > 0 && (
    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">
            Please fix the following before saving:
        </p>
        <ul className="text-sm text-red-600 dark:text-red-300 list-disc list-inside space-y-0.5">
            {saveErrors.map(e => <li key={e.field}>{e.message}</li>)}
        </ul>
    </div>
)}
```

Add `border-red-500` class to the name input, categories selector, and instructions section header when their respective field appears in `saveErrors`. Example for name input:

```tsx
className={`... ${saveErrors.some(e => e.field === 'name') ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
```

Add red outline to ingredient rows where `ingredientId` is missing:

```tsx
className={`... ${!ing.ingredientId ? 'border-red-400 dark:border-red-600' : ''}`}
```

- [ ] **Step 5: Clear saveErrors when user edits any field**

In `RecipeModal/index.tsx`, call `setSaveErrors([])` in the `onChange` handler passed to `RecipeEditForm` so errors clear as the user makes corrections.

- [ ] **Step 6: Manual test**

Run `npm run dev` and verify:
- Saving a recipe with no name shows the red banner and highlights the name field
- Saving a recipe with an unlinked ingredient shows the banner listing the ingredient name
- Fixing the error and re-saving works normally
- The banner clears when the user edits a field

- [ ] **Step 7: Commit**

```bash
git add src/components/RecipeModal/index.tsx src/components/RecipeModal/RecipeEditForm.tsx
git commit -m "Wire client-side validation into save flow with inline error display"
```

---

## Chunk 4: Import UI

### Task 8: ImportRecipeModal component

**Files:**
- Create: `prompt-pantry-app/src/components/ImportRecipeModal.tsx`
- Modify: `prompt-pantry-app/src/components/RecipeModal/index.tsx`

- [ ] **Step 1: Create ImportRecipeModal.tsx**

Create `prompt-pantry-app/src/components/ImportRecipeModal.tsx`:

```tsx
import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { importRecipeFromHtml, resolveIngredients, type ImportedRecipe } from '../utils/recipeImporter';
import type { IngredientDefinition } from '../types';

interface Props {
    onClose: () => void;
    onImport: (recipe: ImportedRecipe, sourceUrl: string | undefined) => void;
    ingredientLibrary: IngredientDefinition[];
}

export function ImportRecipeModal({ onClose, onImport, ingredientLibrary }: Props) {
    const [url, setUrl] = useState('');
    const [html, setHtml] = useState('');
    const [showPaste, setShowPaste] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parse = (htmlContent: string, sourceUrl?: string) => {
        try {
            const raw = importRecipeFromHtml(htmlContent, sourceUrl);
            // Resolve flat ingredients; grouped ingredients resolved per-group
            const resolvedIngredients = Array.isArray(raw.ingredients)
                ? resolveIngredients(
                    raw.ingredients.flatMap((i: any) => typeof i === 'object' && 'items' in i ? i.items : [i]),
                    ingredientLibrary
                  )
                : [];
            onImport({ ...raw, ingredients: resolvedIngredients as any }, sourceUrl);
        } catch (e: any) {
            setError(e.message ?? 'Failed to parse recipe');
        }
    };

    const handleFetch = async () => {
        if (!url.trim()) return;
        setError(null);
        setLoading(true);
        try {
            const res = await fetch(`/api/recipes/scrape?url=${encodeURIComponent(url)}`);
            if (!res.ok) throw new Error('Could not fetch page');
            const { html: fetched } = await res.json();
            parse(fetched, url);
        } catch {
            setShowPaste(true);
        } finally {
            setLoading(false);
        }
    };

    const handlePaste = () => {
        setError(null);
        // Try to auto-extract URL from pasted HTML
        const urlMatch = html.match(/rel="canonical"\s+href="([^"]+)"|content="(https?:\/\/[^"]+)"\s+property="og:url"/);
        const extractedUrl = urlMatch?.[1] ?? urlMatch?.[2] ?? undefined;
        parse(html, url.trim() || extractedUrl);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Import Recipe</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Mode 1: URL */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Recipe URL</label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            placeholder="https://example.com/recipe"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleFetch()}
                            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button
                            onClick={handleFetch}
                            disabled={loading || !url.trim()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import'}
                        </button>
                    </div>
                </div>

                {/* Mode 2: HTML paste — shown after fetch failure or always as fallback */}
                {showPaste && (
                    <div className="space-y-2 pt-2 border-t dark:border-gray-700">
                        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                            Couldn't fetch this page automatically — it may block scrapers. Paste the page source below instead.
                        </p>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Page source
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Right-click the recipe card → Inspect → right-click highlighted element → Copy → Copy outerHTML. Or: right-click anywhere → View Page Source → Select All → Copy.
                        </p>
                        <textarea
                            value={html}
                            onChange={e => setHtml(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="Paste HTML here..."
                        />
                        <button
                            onClick={handlePaste}
                            disabled={!html.trim()}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
                        >
                            Parse Recipe
                        </button>
                    </div>
                )}

                {/* Show paste option manually even before failure */}
                {!showPaste && (
                    <button
                        onClick={() => setShowPaste(true)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
                    >
                        Paste HTML instead
                    </button>
                )}

                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Wire ImportRecipeModal into RecipeModal/index.tsx**

Read `prompt-pantry-app/src/components/RecipeModal/index.tsx` fully, then:

1. Add `showImportModal` state: `const [showImportModal, setShowImportModal] = useState(false);`

2. Add an "Import from website" button to the modal header (alongside or near the edit/view toggle).

3. Render `ImportRecipeModal` when `showImportModal` is true:

```tsx
{showImportModal && (
    <ImportRecipeModal
        onClose={() => setShowImportModal(false)}
        ingredientLibrary={ingredients} // from useIngredients hook
        onImport={(parsed, sourceUrl) => {
            setShowImportModal(false);
            setEditedRecipe(parsed as any);
            setMacroInputs({
                calories: String(parsed.macros.calories),
                protein: String(parsed.macros.protein),
                carbs: String(parsed.macros.carbs),
                fat: String(parsed.macros.fat),
            });
            setServingsInput(String(parsed.servings ?? 1));
            setIsImported(true); // new flag for the amber banner
            setMode('edit');
        }}
    />
)}
```

4. Add `isImported` state: `const [isImported, setIsImported] = useState(false);`

5. Pass `isImported` to `RecipeEditForm` to trigger the amber review banner.

- [ ] **Step 3: Add amber review banner to RecipeEditForm**

In `RecipeEditForm.tsx`, accept `isImported: boolean` prop. Add the banner at the top of the form when `isImported` is true:

```tsx
{isImported && (
    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">
            Review required before saving
        </p>
        <p className="text-sm text-amber-600 dark:text-amber-300">
            This recipe was imported automatically. Check that the category is correct (defaults to "Misc"), ingredients are linked to your library, instructions are complete, times and servings are accurate, and macros are filled in (default 0 if not found).
        </p>
    </div>
)}
```

- [ ] **Step 4: Manual test**

Run `npm run dev`. Open a recipe or click "Add Recipe":
- "Import from website" button is visible
- Clicking it opens `ImportRecipeModal`
- Entering a URL and clicking Import shows the spinner then pre-fills the form
- If the URL fetch fails, the HTML paste area appears
- After import, the amber banner is visible in the form
- Saving a recipe with unlinked ingredients shows the red error banner

- [ ] **Step 5: Commit**

```bash
git add src/components/ImportRecipeModal.tsx src/components/RecipeModal/index.tsx src/components/RecipeModal/RecipeEditForm.tsx
git commit -m "Add recipe import modal with URL fetch and HTML paste fallback"
```

---

## Chunk 5: Suggestion Algorithm

### Task 9: Extract scoring logic to a pure utility

**Files:**
- Create: `prompt-pantry-app/src/utils/suggestionScoring.ts`
- Test: `prompt-pantry-app/test/utils/suggestionScoring.test.ts`
- Modify: `prompt-pantry-app/src/components/RecipePicker.tsx`

- [ ] **Step 1: Write failing tests**

Create `prompt-pantry-app/test/utils/suggestionScoring.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
    scoreIngredientSuggestion,
    scoreMacroSuggestion,
    buildWeekIngredientSet,
    type SuggestionContext,
} from '../../src/utils/suggestionScoring.js';
import type { Recipe, IngredientDefinition } from '../../src/types.js';

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
    name: 'Test Recipe',
    categories: ['Dinner'],
    ingredients: [{ ingredient: 'Chicken', ingredientId: 'uuid-chicken' }],
    instructions: ['Cook'],
    macros: { calories: 400, protein: 30, carbs: 20, fat: 15 },
    prepTime: '10', cookTime: '20', servings: 2, tags: [],
    ...overrides,
});

const library: IngredientDefinition[] = [
    { id: 'uuid-chicken', canonical: 'Chicken Breast', aliases: ['chicken'], storeSection: 'Meat', containerSizes: [], conversions: [] },
    { id: 'uuid-garlic', canonical: 'Garlic', aliases: [], storeSection: 'Produce', containerSizes: [], conversions: [] },
];

const weekRecipes = [
    makeRecipe({ name: 'Week Recipe', ingredients: [{ ingredient: 'Garlic', ingredientId: 'uuid-garlic' }] }),
];

const weekIngredientIds = new Set(['uuid-garlic']);

describe('buildWeekIngredientSet', () => {
    it('returns set of ingredientIds from week recipes', () => {
        const result = buildWeekIngredientSet(weekRecipes);
        expect(result.has('uuid-garlic')).toBe(true);
    });

    it('ignores ingredients without ingredientId', () => {
        const recipes = [makeRecipe({ ingredients: [{ ingredient: 'Mystery' }] })];
        const result = buildWeekIngredientSet(recipes);
        expect(result.size).toBe(0);
    });
});

describe('scoreIngredientSuggestion', () => {
    it('returns score 0 for no shared ingredients', () => {
        const result = scoreIngredientSuggestion(makeRecipe(), weekIngredientIds, { useRatingBonus: false });
        expect(result.sharedCount).toBe(0);
    });

    it('returns positive sharedCount for matching ingredient', () => {
        const recipe = makeRecipe({
            ingredients: [{ ingredient: 'Garlic', ingredientId: 'uuid-garlic' }],
        });
        const result = scoreIngredientSuggestion(recipe, weekIngredientIds, { useRatingBonus: false });
        expect(result.sharedCount).toBe(1);
        expect(result.score).toBeGreaterThan(0);
    });

    it('applies rating bonus when enabled', () => {
        const liked = makeRecipe({ rating: 'up' });
        const neutral = makeRecipe({ ingredients: [{ ingredient: 'Garlic', ingredientId: 'uuid-garlic' }] });
        const withBonus = scoreIngredientSuggestion(liked, weekIngredientIds, { useRatingBonus: true });
        const withoutBonus = scoreIngredientSuggestion(liked, weekIngredientIds, { useRatingBonus: false });
        expect(withBonus.score).toBeGreaterThan(withoutBonus.score);
    });

    it('does not apply rating bonus when disabled', () => {
        const liked = makeRecipe({ rating: 'up', ingredients: [{ ingredient: 'Garlic', ingredientId: 'uuid-garlic' }] });
        const neutral = makeRecipe({ ingredients: [{ ingredient: 'Garlic', ingredientId: 'uuid-garlic' }] });
        const likedScore = scoreIngredientSuggestion(liked, weekIngredientIds, { useRatingBonus: false }).score;
        const neutralScore = scoreIngredientSuggestion(neutral, weekIngredientIds, { useRatingBonus: false }).score;
        expect(likedScore).toBe(neutralScore);
    });

    it('penalizes thumbs-down recipe when bonus enabled', () => {
        const disliked = makeRecipe({ rating: 'down', ingredients: [{ ingredient: 'Garlic', ingredientId: 'uuid-garlic' }] });
        const neutral = makeRecipe({ ingredients: [{ ingredient: 'Garlic', ingredientId: 'uuid-garlic' }] });
        expect(scoreIngredientSuggestion(disliked, weekIngredientIds, { useRatingBonus: true }).score)
            .toBeLessThan(scoreIngredientSuggestion(neutral, weekIngredientIds, { useRatingBonus: true }).score);
    });
});

describe('scoreMacroSuggestion', () => {
    const targets = { calories: 2000, protein: 150, carbs: 200, fat: 70 };
    const planned = { calories: 1200, protein: 80, carbs: 130, fat: 40 };

    it('returns a positive score for a recipe that fills gaps', () => {
        const result = scoreMacroSuggestion(makeRecipe(), targets, planned, weekIngredientIds, 1, 0);
        expect(result.score).toBeGreaterThan(0);
    });

    it('reduces score when a macro is already exceeded', () => {
        const overPlanned = { ...planned, protein: 200 }; // over target of 150
        const normal = scoreMacroSuggestion(makeRecipe(), targets, overPlanned, weekIngredientIds, 1, 0);
        const exceeded = scoreMacroSuggestion(makeRecipe(), targets, { ...planned, protein: 200 }, weekIngredientIds, 1, 0);
        expect(exceeded.score).toBeLessThan(normal.score);
    });

    it('scales score with serving multiplier', () => {
        const single = scoreMacroSuggestion(makeRecipe(), targets, planned, weekIngredientIds, 1, 0);
        const double = scoreMacroSuggestion(makeRecipe(), targets, planned, weekIngredientIds, 2, 0);
        expect(double.score).toBeGreaterThan(single.score);
    });

    it('applies recency penalty for frequently cooked recipes', () => {
        const fresh = scoreMacroSuggestion(makeRecipe(), targets, planned, weekIngredientIds, 1, 0);
        const stale = scoreMacroSuggestion(makeRecipe(), targets, planned, weekIngredientIds, 1, 5);
        expect(stale.score).toBeLessThan(fresh.score);
    });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run test/utils/suggestionScoring.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement suggestionScoring.ts**

Create `prompt-pantry-app/src/utils/suggestionScoring.ts`:

```ts
import type { Recipe } from '../types';
import { flattenIngredients } from './recipeUtils';

export interface SuggestionResult {
    recipe: Recipe;
    sharedCount: number;
    sharedIngredients: string[];
    score: number;
}

export interface IngredientSuggestionOptions {
    useRatingBonus: boolean;
}

export function buildWeekIngredientSet(weekRecipes: Recipe[]): Set<string> {
    const ids = new Set<string>();
    weekRecipes.forEach(r => {
        flattenIngredients(r.ingredients).forEach(ing => {
            if (ing.ingredientId) ids.add(ing.ingredientId);
        });
    });
    return ids;
}

export function scoreIngredientSuggestion(
    recipe: Recipe,
    weekIngredientIds: Set<string>,
    options: IngredientSuggestionOptions
): SuggestionResult {
    const recipeIngredientIds = flattenIngredients(recipe.ingredients)
        .filter(i => i.ingredientId)
        .map(i => i.ingredientId!);

    const shared = recipeIngredientIds.filter(id => weekIngredientIds.has(id));
    const uniqueShared = Array.from(new Set(shared));

    const ratingBonus = options.useRatingBonus
        ? (recipe.rating === 'up' ? 100 : recipe.rating === 'down' ? -50 : 0)
        : 0;

    const score = uniqueShared.length + ratingBonus;

    return { recipe, sharedCount: uniqueShared.length, sharedIngredients: uniqueShared, score };
}

export function scoreMacroSuggestion(
    recipe: Recipe,
    weeklyTargets: { calories: number; protein: number; carbs: number; fat: number },
    weeklyPlanned: { calories: number; protein: number; carbs: number; fat: number },
    weekIngredientIds: Set<string>,
    servingMultiplier: number,
    cookCount: number
): SuggestionResult {
    const macros = {
        calories: recipe.macros.calories * servingMultiplier,
        protein: recipe.macros.protein * servingMultiplier,
        carbs: recipe.macros.carbs * servingMultiplier,
        fat: recipe.macros.fat * servingMultiplier,
    };

    const remaining = {
        calories: weeklyTargets.calories - weeklyPlanned.calories,
        protein: weeklyTargets.protein - weeklyPlanned.protein,
        carbs: weeklyTargets.carbs - weeklyPlanned.carbs,
        fat: weeklyTargets.fat - weeklyPlanned.fat,
    };

    // Normalize contributions by weekly target (stable across the week)
    const contrib = (recipeVal: number, rem: number, target: number): number => {
        if (target <= 0) return 0;
        const fill = Math.min(recipeVal, Math.max(0, rem)) / target;
        // Penalty if macro already exceeded
        if (rem < 0) return 0.5 * (rem / target); // negative value
        return fill;
    };

    const p1 = contrib(macros.protein, remaining.protein, weeklyTargets.protein) +
                contrib(macros.carbs, remaining.carbs, weeklyTargets.carbs) +
                contrib(macros.fat, remaining.fat, weeklyTargets.fat);

    // Find most-deficient macro (largest gap as fraction of target)
    const gaps = (['protein', 'carbs', 'fat'] as const)
        .map(k => ({ k, gap: weeklyTargets[k] > 0 ? remaining[k] / weeklyTargets[k] : 0 }))
        .sort((a, b) => b.gap - a.gap);
    const furthestMacro = gaps[0].k;

    const p2 = contrib(macros[furthestMacro], remaining[furthestMacro], weeklyTargets[furthestMacro]);
    const p3 = contrib(macros.calories, remaining.calories, weeklyTargets.calories);

    // Ingredient overlap tiebreaker
    const recipeIds = flattenIngredients(recipe.ingredients).filter(i => i.ingredientId).map(i => i.ingredientId!);
    const sharedIds = recipeIds.filter(id => weekIngredientIds.has(id));
    const uniqueShared = Array.from(new Set(sharedIds));
    const p4 = uniqueShared.length;

    const rawScore = (p1 * 50) + (p2 * 100) + (p3 * 20) + (p4 * 5);

    // Recency penalty: floor of 20% score, decays by 15% per cook
    const recencyMultiplier = Math.max(0.2, 1 - (cookCount * 0.15));
    const score = rawScore * recencyMultiplier;

    return { recipe, sharedCount: uniqueShared.length, sharedIngredients: uniqueShared, score };
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run test/utils/suggestionScoring.test.ts
```

Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/suggestionScoring.ts test/utils/suggestionScoring.test.ts
git commit -m "Extract suggestion scoring to pure utility with improved algorithm"
```

---

### Task 10: Wire new scoring into RecipePicker and add UI controls

**Files:**
- Modify: `prompt-pantry-app/src/components/RecipePicker.tsx`

*No new tests needed — scoring is already tested. This task is wiring and UI only.*

- [ ] **Step 1: Read RecipePicker.tsx fully**

Read `prompt-pantry-app/src/components/RecipePicker.tsx` to understand the current state and prop shapes before making changes.

- [ ] **Step 2: Add new state for UI controls**

In `RecipePicker.tsx`, add:

```ts
const [minSharedIngredients, setMinSharedIngredients] = useState(1);
const [useRatingBonus, setUseRatingBonus] = useState(true);
```

- [ ] **Step 3: Replace the suggestions useMemo**

Replace the entire `suggestions` useMemo with calls to the new scoring functions:

```ts
import {
    buildWeekIngredientSet,
    scoreIngredientSuggestion,
    scoreMacroSuggestion,
} from '../utils/suggestionScoring';
import { getRecipeCookCount } from '../utils/mealPlanUtils';
import { format } from 'date-fns';

const suggestions = useMemo(() => {
    if (!Array.isArray(recipes)) return [];

    const weekIngredientIds = buildWeekIngredientSet(selectedWeekRecipes);

    const filteredRecipes = recipes.filter(r => {
        if (selectedWeekRecipes.some(wr => wr.name === r.name)) return false;
        if (!participants.every(p => isRecipeFitForParticipant(r, p))) return false;
        const categoryMatch = pickerSelectedCategories.length === 0 || r.categories?.some(c => pickerSelectedCategories.includes(c));
        if (!categoryMatch) return false;
        const tagMatch = pickerSelectedTags.length === 0 || pickerSelectedTags.every(t => r.tags?.includes(t));
        if (!tagMatch) return false;
        const ratingMatch = pickerSelectedRatings.length === 0 || pickerSelectedRatings.includes(r.rating || 'neutral');
        const favoriteMatch = !pickerShowOnlyFavorites || r.isFavorite;
        const neverCookedMatch = !pickerShowOnlyNeverCooked || getRecipeCookCount(multiWeeklyCookPlan, mealPlan, r.name) === 0;
        return ratingMatch && favoriteMatch && neverCookedMatch;
    });

    if (suggestionMode === 'ingredients') {
        if (selectedWeekRecipes.length === 0) return [];
        return filteredRecipes
            .map(r => scoreIngredientSuggestion(r, weekIngredientIds, { useRatingBonus }))
            .filter(item => item.sharedCount >= minSharedIngredients)
            .sort((a, b) => b.score - a.score);
    } else {
        const weeklyTargets = participants.reduce((acc, p) => {
            const t = calculateParticipantTargets(p);
            return { calories: acc.calories + t.calories * 7, protein: acc.protein + t.protein * 7, carbs: acc.carbs + t.carbs * 7, fat: acc.fat + t.fat * 7 };
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

        const weeklyPlanned = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        weekDays.forEach(day => {
            const dStr = format(day, 'yyyy-MM-dd');
            const dayPlan = mealPlan[dStr] || {};
            [dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner, dayPlan.snacks, dayPlan.drinks]
                .flatMap(arr => Array.isArray(arr) ? arr : [])
                .forEach(m => {
                    weeklyPlanned.calories += m.recipe.macros.calories * m.servings;
                    weeklyPlanned.protein += m.recipe.macros.protein * m.servings;
                    weeklyPlanned.carbs += m.recipe.macros.carbs * m.servings;
                    weeklyPlanned.fat += m.recipe.macros.fat * m.servings;
                });
        });

        return filteredRecipes
            .map(r => scoreMacroSuggestion(
                r,
                weeklyTargets,
                weeklyPlanned,
                weekIngredientIds,
                selectedRecipes[r.name] ?? 1,
                getRecipeCookCount(multiWeeklyCookPlan, mealPlan, r.name)
            ))
            .sort((a, b) => b.score - a.score);
    }
}, [selectedWeekRecipes, recipes, participants, suggestionMode, mealPlan, multiWeeklyCookPlan, weekDays,
    pickerSelectedRatings, pickerShowOnlyFavorites, pickerShowOnlyNeverCooked, pickerSelectedCategories,
    pickerSelectedTags, minSharedIngredients, useRatingBonus, selectedRecipes]);
```

- [ ] **Step 4: Add UI controls to the Suggestions toolbar**

In the Suggestions tab toolbar (the `div` with `Suggestion Mode:` text), add after the Ingredients/Macros toggle:

```tsx
{/* Min shared ingredients (ingredients mode only) */}
{suggestionMode === 'ingredients' && (
    <div className="flex items-center gap-2 ml-3">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Min shared:
        </span>
        <div className="flex items-center gap-1">
            <button
                onClick={() => setMinSharedIngredients(Math.max(1, minSharedIngredients - 1))}
                className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold text-xs"
            >-</button>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 w-4 text-center">
                {minSharedIngredients}
            </span>
            <button
                onClick={() => setMinSharedIngredients(Math.min(5, minSharedIngredients + 1))}
                className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold text-xs"
            >+</button>
        </div>
    </div>
)}

{/* Rating bonus toggle (ingredients mode only) */}
{suggestionMode === 'ingredients' && (
    <button
        onClick={() => setUseRatingBonus(!useRatingBonus)}
        className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
            useRatingBonus
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
        }`}
        title="Use thumbs up/down weighting"
    >
        Rating bonus
    </button>
)}
```

- [ ] **Step 5: Manual test**

Run `npm run dev`. Open the recipe picker and go to the Suggestions tab:
- Ingredients mode: "Min shared" stepper and "Rating bonus" toggle are visible
- Adjusting min shared threshold changes which recipes appear
- Toggling rating bonus changes ordering of liked/disliked recipes
- Macros mode: no extra controls visible, scores are different from before

- [ ] **Step 6: Run full test suite**

```bash
cd prompt-pantry-app
npm test
```

Expected: All existing tests pass + all new tests pass. No regressions.

- [ ] **Step 7: Commit**

```bash
git add src/components/RecipePicker.tsx
git commit -m "Wire improved suggestion scoring into RecipePicker with new UI controls"
```

---

## Chunk 6: Documentation

### Task 11: Update documentation

**Files:**
- Modify: `documentation/agentic-context/PROJECT_CONTEXT.md`
- Modify: `documentation/README.md`

- [ ] **Step 1: Update implementation status in PROJECT_CONTEXT.md**

Open `documentation/agentic-context/PROJECT_CONTEXT.md`. In the `## Implementation Status` table, add or update these rows:

| Area                 | Description                                                          | Status   |
|----------------------|----------------------------------------------------------------------|----------|
| Recipe Importer      | URL-based scrape + HTML fallback; WPRM / Tasty Recipes / JSON-LD    | Complete |
| Save Validation      | Client-side validation with inline field errors; unlinked-ingredient block | Complete |
| Suggestion Algorithm | Library-based ingredient overlap + normalized macro gap scoring      | Complete |

- [ ] **Step 2: Record architecture decisions in PROJECT_CONTEXT.md**

In the `## Architecture Decisions` section, add a new subsection:

```markdown
### Recipe Importer (2026-03-28)

- **Server-side scrape proxy** (`GET /api/recipes/scrape?url=`) chosen over client-side fetch because CORS blocks direct access to all major recipe sites.
- **Plugin-first detection chain** (WPRM → Tasty Recipes → JSON-LD) because the majority of popular recipe sites use WordPress plugins that expose richer structured data than schema.org JSON-LD alone.
- **No auto-creation of ingredients** on import — unresolved ingredients are flagged as validation errors; users must create them manually before saving.
- **Client-side validation** runs before every save (not just imports) — modal stays open, errors displayed inline with red outlines and a top-of-form banner.
- **HTML fixture files committed** to `test/fixtures/` as small HTML snapshots extracted from `Recipes-to-scrape.txt`; the source file itself is gitignored to avoid committing large external data.
- **`resolveIngredients()`** is a separately exported function from `recipeImporter.ts` (not a private helper) so `RecipeModal` can call it independently of `importRecipeFromHtml`.

### Suggestion Algorithm (2026-03-28)

- **Ingredient mode** switched from raw-string heuristics to `ingredientId`-based library matching now that the ingredient library is complete.
- **Macro mode** normalized by `weeklyTargets` (not remaining) for stable scores early in the week; overshoot penalised at 50% weight rather than zero-clamped.
- **Recency multiplier** `max(0.2, 1 - cookCount × 0.15)` applied in both modes to reduce repetition.
- **Serving count multiplier** in macro scoring uses `selectedRecipes[r.name]` (how many times the recipe already appears in the plan) to proportionally scale the macro contribution when scoring gap-filling.
```

- [ ] **Step 3: Update documentation/README.md**

Open `documentation/README.md`. Verify the Agentic Context section lists both the new design doc and the implementation plan. If the table is present, add rows (or confirm they exist):

| Document                                                                                     | Description                                                                |
|----------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|
| [Recipe Importer Design](agentic-context/agent-designs/2026-03-28-recipe-importer-design.md) | Architecture, UX flow, parser design, ingredient resolution, save validation |
| [Recipe Importer Plan](agentic-context/implementation-plans/2026-03-28-recipe-importer-and-suggestions.md) | Phased implementation plan with TDD steps                   |

- [ ] **Step 4: Commit**

```bash
git add documentation/
git commit -m "Update docs: recipe importer decisions"
```

---

## Predicted Regressions

Review this section before running `npm test` for the first time after each task. These are the most likely breakage points.

### RecipeModal / RecipeEditForm prop changes

`RecipeEditForm` gains two new required props (`saveErrors`, `isImported`). Any test that renders `RecipeModal` or `RecipeEditForm` directly without these props will fail with a TypeScript error at build time and a runtime prop-mismatch at test time. Files to check:

- `test/components/RecipeModal.test.tsx` (if it exists)
- Any snapshot tests that render `RecipeEditForm`

**Fix:** Add `saveErrors={[]}` and `isImported={false}` to all test renders of these components.

### Save validation intercepts submit

`RecipeModal` now runs `validateRecipe` before sending the save request. Tests that assert a `fetch` / `apiRequest` call fires immediately on clicking Save will fail silently — the component renders fine (no missing-prop crash) but the expected network call never happens because validation intercepts it when any required field is empty or any ingredient is unlinked.

- Any test in `test/components/RecipeModal.test.tsx` that clicks Save on a recipe with empty `name`, empty `instructions`, or an ingredient missing `ingredientId` and then asserts a POST was made

**Fix:** Ensure test fixtures have a fully valid recipe (name, categories, linked ingredients, non-empty instructions) before asserting on the save network call. Add a separate test asserting that an invalid recipe does *not* make a network call and instead sets `saveErrors`.

### Suggestion algorithm: RecipePicker tests

`RecipePicker.tsx` previously computed scores inline in a `useMemo`. After Task 9, scoring is delegated to `suggestionScoring.ts`. Any test that asserts on suggestion ordering will break because the scoring rules have changed — not because missing `ingredientId` causes errors (unlinked ingredients simply score 0 overlap), but because the relative ordering of recipes changes under the new weights, normalization, and recency multiplier.

- `test/components/RecipePicker.test.tsx` (if it exists)

**Fix:** Re-verify expected ordering against the new scoring rules. If test fixtures have no `ingredientId` on ingredients, all recipes will score 0 overlap in ingredient mode and ordering will be arbitrary — update fixtures to have at least some linked ingredients to produce meaningful ordering assertions.

### DOMParser in Vitest / jsdom

`recipeImporter.ts` uses `new DOMParser()`. Vitest runs in Node by default; `DOMParser` is not available in the Node environment. Tests for `recipeImporter.ts` must use the `jsdom` environment.

**Fix:** Add `@vitest-environment jsdom` at the top of `test/utils/recipeImporter.test.ts` (already specified in Task 3), and ensure `vitest.config.ts` does not override this to `node` globally.

### Ingredient data shape in validation

`validateRecipe` in `recipeValidation.ts` checks `ingredient.ingredientId`. The existing recipe data uses grouped ingredients: `{ items: [{ name, ingredientId, ... }] }`. If `validateRecipe` iterates `recipe.ingredients` assuming a flat array it will miss the nested `items` array entirely and never catch unlinked ingredients.

**Fix:** Implement `validateRecipe` using `flattenIngredients()` (already used in `recipeUtils.ts`) rather than iterating `recipe.ingredients` directly.

### TypeScript strict mode: new files

`noUnusedLocals` and `noUnusedParameters` are enforced. Common mistakes in new files:

- Importing a type that ends up unused after a refactor
- A function parameter added for future use
- `_` prefix is not sufficient — remove unused items entirely

**Fix:** Run `npm run build` after each task to catch these before the final verification.

### ESLint: no console.log

All new files (`scrapeRoutes.js`, `recipeImporter.ts`, `recipeValidation.ts`, `suggestionScoring.ts`, `ImportRecipeModal.tsx`) must use `console.warn` / `console.error` only. Any debug `console.log` left in will cause lint to count toward the 50-warning limit.

### Server test isolation: scrape route registration

`test/server/scrapeApi.test.ts` uses `createTestEnvironment()` which calls `createServer()` (or equivalent). If `serverFactory.js` is not updated to register `scrapeRoutes`, the test app will not have the route and all tests will return 404. The test for the 401 case may accidentally pass (Express returns 404 before auth middleware on unknown routes) — masking the missing registration.

**Fix:** Register `scrapeRoutes` in `serverFactory.js` in Task 2 Step 4 before running the test suite.

### Pre-push hook: version bump

The `pre-push` hook auto-bumps the patch version in `Navigation.tsx` and amends the commit. This runs on `git push`, not `git commit`. It will not break any test, but the amended commit changes the commit hash — be aware if comparing hashes before/after push.

---

## Final verification

- [ ] Run `npm run lint` — expect ≤50 warnings, no new errors
- [ ] Run `npm test` — all tests pass
- [ ] Run `npm run build` — clean build with no TypeScript errors
- [ ] Manual smoke test: import a recipe via URL, verify pre-fill, verify unlinked ingredient block on save, verify suggestion modes work

---

## Squash commits

The pre-implementation baseline is `75fd91ae1e623b3bbed1de8f74adc2c7fb5356e0`. All commits added during this implementation should be squashed into a single commit on top of that baseline, leaving exactly two local commits: the baseline and the squashed feature commit.

- [ ] **Step 1: Verify baseline is present**

```bash
git log --oneline | tail -5
```

Confirm `75fd91ae` appears and that all implementation commits sit above it.

- [ ] **Step 2: Soft-reset to baseline**

```bash
git reset --soft 75fd91ae1e623b3bbed1de8f74adc2c7fb5356e0
```

All changes from implementation commits are now staged but uncommitted.

- [ ] **Step 3: Create the squash commit**

```bash
git commit -m "$(cat <<'EOF'
Add recipe importer and improve suggestions

Recipe Importer:
- Server-side scrape proxy (GET /api/recipes/scrape?url=)
  bypasses CORS on recipe sites; 10s timeout, http/https only
- Client-side parser dispatches to WPRM, Tasty Recipes, or
  JSON-LD based on page structure
- HTML fallback: user can paste page source when URL fetch fails
- Ingredient resolution matches parsed names against canonical
  library (name + aliases); unmatched ingredients left without
  ingredientId for user to resolve
- Imported recipes pre-fill RecipeEditForm with amber review
  banner; notes include "Imported from: <url>"
- Test fixtures committed to test/fixtures/ (5 HTML snapshots);
  Recipes-to-scrape.txt added to .gitignore

Save Validation:
- validateRecipe() runs client-side before every save request
- Modal stays open on failure; red outlines on failing fields;
  red error banner at top of form
- Hard block on unlinked ingredients, empty name, empty
  instructions, and non-numeric macros

Suggestion Algorithm:
- Ingredient mode: switched from raw-string heuristics to
  ingredientId-based library matching; configurable min-shared
  threshold stepper; toggleable rating bonus
- Macro mode: revised weights (p1×50, p2×100, p3×20, p4×5);
  normalized by weeklyTargets for stable early-week scores;
  overshoot penalty at 50% weight; serving count multiplier
- Recency multiplier max(0.2, 1 - cookCount × 0.15) in both modes
- Scoring extracted to suggestionScoring.ts for unit testability

Documentation:
- PROJECT_CONTEXT.md updated with implementation status and
  architecture decisions
- documentation/README.md updated with links to design doc and
  implementation plan
EOF
)"
```

- [ ] **Step 4: Verify final state**

```bash
git log --oneline
```

Expected: exactly two commits — `75fd91ae` (baseline) and the new squash commit at HEAD.
