/**
 * Store Section Routes - CRUD for store sections with ingredient reassignment on delete.
 */

export function registerStoreSectionRoutes(app, { dataAccess, middleware, validators }) {
    const { readStoreSections, writeStoreSections, readIngredients, saveIngredients, validateOrFail } = dataAccess;
    const { authenticate, requireEditor } = middleware;
    const { storeSectionValidator } = validators;

    app.get('/api/store-sections', authenticate, (req, res) => {
        res.json(readStoreSections());
    });

    app.post('/api/store-sections', authenticate, requireEditor, (req, res) => {
        const { name, emoji } = req.body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Section name is required' });
        }

        const trimmedName = name.trim();
        const sections = readStoreSections();

        const conflict = sections.find(s => s.name.toLowerCase() === trimmedName.toLowerCase());
        if (conflict) {
            return res.status(400).json({ error: 'A section with this name already exists' });
        }

        const newSection = { name: trimmedName };
        if (emoji && typeof emoji === 'string') {
            newSection.emoji = emoji;
        }

        const updated = [...sections, newSection];
        if (!validateOrFail(res, storeSectionValidator, updated, 'store sections', req)) return;

        writeStoreSections(updated);
        res.status(201).json(newSection);
    });

    app.put('/api/store-sections/:name', authenticate, requireEditor, (req, res) => {
        const oldName = decodeURIComponent(req.params.name);
        const { name: newName, emoji } = req.body;

        const sections = readStoreSections();
        const idx = sections.findIndex(s => s.name === oldName);
        if (idx === -1) {
            return res.status(404).json({ error: 'Section not found' });
        }

        const trimmedName = (newName && typeof newName === 'string') ? newName.trim() : oldName;

        if (trimmedName !== oldName) {
            const conflict = sections.find((s, i) => i !== idx && s.name.toLowerCase() === trimmedName.toLowerCase());
            if (conflict) {
                return res.status(400).json({ error: 'A section with this name already exists' });
            }
        }

        const updated = [...sections];
        const updatedSection = { name: trimmedName };
        if (emoji !== undefined) {
            // Allow explicit empty string to clear the emoji
            if (typeof emoji === 'string' && emoji.trim() !== '') {
                updatedSection.emoji = emoji;
            }
            // else: emoji === "" clears it (omit from object)
        } else if (sections[idx].emoji) {
            updatedSection.emoji = sections[idx].emoji;
        }
        updated[idx] = updatedSection;

        if (!validateOrFail(res, storeSectionValidator, updated, 'store sections', req)) return;

        writeStoreSections(updated);

        if (trimmedName !== oldName) {
            const ingredients = readIngredients();
            const affected = ingredients.filter(i => i.storeSection === oldName);
            if (affected.length > 0) {
                const updatedIngredients = ingredients.map(i =>
                    i.storeSection === oldName ? { ...i, storeSection: trimmedName } : i
                );
                saveIngredients(updatedIngredients);
            }
        }

        res.json(updatedSection);
    });

    app.delete('/api/store-sections/:name', authenticate, requireEditor, (req, res) => {
        const name = decodeURIComponent(req.params.name);
        const { action, targetSection } = req.body || {};

        if (!action || !['uncategorize', 'merge'].includes(action)) {
            return res.status(400).json({ error: 'action must be "uncategorize" or "merge"' });
        }

        if (action === 'merge' && (!targetSection || typeof targetSection !== 'string')) {
            return res.status(400).json({ error: 'targetSection is required for merge action' });
        }

        const sections = readStoreSections();
        const idx = sections.findIndex(s => s.name === name);
        if (idx === -1) {
            return res.status(404).json({ error: 'Section not found' });
        }

        if (action === 'merge') {
            const targetExists = sections.some(s => s.name === targetSection);
            if (!targetExists) {
                return res.status(400).json({ error: `Target section "${targetSection}" does not exist` });
            }
            if (targetSection === name) {
                return res.status(400).json({ error: 'Cannot merge a section into itself' });
            }
        }

        if (action === 'uncategorize') {
            const unassignedExists = sections.some(s => s.name === 'Unassigned');
            if (!unassignedExists) {
                return res.status(400).json({ error: 'Cannot uncategorize: "Unassigned" section does not exist' });
            }
        }

        const replacement = action === 'uncategorize' ? 'Unassigned' : targetSection;
        const ingredients = readIngredients();
        const affected = ingredients.filter(i => i.storeSection === name);
        if (affected.length > 0) {
            const updatedIngredients = ingredients.map(i =>
                i.storeSection === name ? { ...i, storeSection: replacement } : i
            );
            saveIngredients(updatedIngredients);
        }

        const updatedSections = sections.filter((_, i) => i !== idx);
        writeStoreSections(updatedSections);

        res.status(204).send();
    });
}
