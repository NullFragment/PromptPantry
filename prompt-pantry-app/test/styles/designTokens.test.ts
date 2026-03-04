import {describe, expect, it} from 'vitest';
import {
    badgeStyles,
    buttonStyles,
    cardStyles,
    colors,
    getBadgeClasses,
    getButtonClasses,
    getInputClasses,
    getMealTypeBg,
    getMealTypeBorder,
    getMealTypeStyle,
    getMealTypeText,
    inputStyles,
    layoutStyles,
    macroColors,
    mealTypeStyles,
    modalStyles,
    spacing,
    statusStyles,
    transitionStyles,
    typographyStyles
} from '../../src/styles/designTokens';

describe('designTokens', () => {
    describe('mealTypeStyles', () => {
        it('has styles for all meal types', () => {
            expect(mealTypeStyles.breakfast).toBeDefined();
            expect(mealTypeStyles.lunch).toBeDefined();
            expect(mealTypeStyles.dinner).toBeDefined();
            expect(mealTypeStyles.snacks).toBeDefined();
            expect(mealTypeStyles.drinks).toBeDefined();
        });

        it('each meal type has bg, text, border, and combined properties', () => {
            const types = ['breakfast', 'lunch', 'dinner', 'snacks', 'drinks'] as const;

            types.forEach(type => {
                expect(mealTypeStyles[type].bg).toBeDefined();
                expect(mealTypeStyles[type].text).toBeDefined();
                expect(mealTypeStyles[type].border).toBeDefined();
                expect(mealTypeStyles[type].combined).toBeDefined();
            });
        });
    });

    describe('getMealTypeStyle', () => {
        it('returns combined styles for each meal type', () => {
            expect(getMealTypeStyle('breakfast')).toBe(mealTypeStyles.breakfast.combined);
            expect(getMealTypeStyle('lunch')).toBe(mealTypeStyles.lunch.combined);
            expect(getMealTypeStyle('dinner')).toBe(mealTypeStyles.dinner.combined);
        });
    });

    describe('getMealTypeBg', () => {
        it('returns bg styles for each meal type', () => {
            expect(getMealTypeBg('breakfast')).toBe(mealTypeStyles.breakfast.bg);
            expect(getMealTypeBg('dinner')).toBe(mealTypeStyles.dinner.bg);
        });
    });

    describe('getMealTypeText', () => {
        it('returns text styles for each meal type', () => {
            expect(getMealTypeText('breakfast')).toBe(mealTypeStyles.breakfast.text);
            expect(getMealTypeText('lunch')).toBe(mealTypeStyles.lunch.text);
        });
    });

    describe('getMealTypeBorder', () => {
        it('returns border styles for each meal type', () => {
            expect(getMealTypeBorder('breakfast')).toBe(mealTypeStyles.breakfast.border);
            expect(getMealTypeBorder('snacks')).toBe(mealTypeStyles.snacks.border);
        });
    });

    describe('statusStyles', () => {
        it('has styles for all status types', () => {
            expect(statusStyles.success).toBeDefined();
            expect(statusStyles.warning).toBeDefined();
            expect(statusStyles.error).toBeDefined();
            expect(statusStyles.info).toBeDefined();
            expect(statusStyles.neutral).toBeDefined();
        });

        it('each status has bg, text, light, and border properties', () => {
            const statuses = ['success', 'warning', 'error', 'info', 'neutral'] as const;

            statuses.forEach(status => {
                expect(statusStyles[status].bg).toBeDefined();
                expect(statusStyles[status].text).toBeDefined();
                expect(statusStyles[status].light).toBeDefined();
                expect(statusStyles[status].border).toBeDefined();
            });
        });
    });

    describe('buttonStyles', () => {
        it('has base styles', () => {
            expect(buttonStyles.base).toBeDefined();
            expect(buttonStyles.base).toContain('inline-flex');
        });

        it('has variant styles', () => {
            expect(buttonStyles.variants.primary).toBeDefined();
            expect(buttonStyles.variants.secondary).toBeDefined();
            expect(buttonStyles.variants.danger).toBeDefined();
            expect(buttonStyles.variants.ghost).toBeDefined();
            expect(buttonStyles.variants.success).toBeDefined();
        });

        it('has size styles', () => {
            expect(buttonStyles.sizes.sm).toBeDefined();
            expect(buttonStyles.sizes.md).toBeDefined();
            expect(buttonStyles.sizes.lg).toBeDefined();
        });

        it('has disabled styles', () => {
            expect(buttonStyles.disabled).toContain('opacity-50');
        });
    });

    describe('getButtonClasses', () => {
        it('returns combined button classes with defaults', () => {
            const classes = getButtonClasses();

            expect(classes).toContain(buttonStyles.base);
            expect(classes).toContain(buttonStyles.variants.primary);
            expect(classes).toContain(buttonStyles.sizes.md);
        });

        it('applies variant correctly', () => {
            const classes = getButtonClasses('secondary');

            expect(classes).toContain(buttonStyles.variants.secondary);
        });

        it('applies size correctly', () => {
            const classes = getButtonClasses('primary', 'lg');

            expect(classes).toContain(buttonStyles.sizes.lg);
        });

        it('applies disabled styles when disabled', () => {
            const classes = getButtonClasses('primary', 'md', true);

            expect(classes).toContain(buttonStyles.disabled);
        });

        it('does not apply disabled styles when not disabled', () => {
            const classes = getButtonClasses('primary', 'md', false);

            expect(classes).not.toContain(buttonStyles.disabled);
        });
    });

    describe('cardStyles', () => {
        it('has all card variants', () => {
            expect(cardStyles.base).toBeDefined();
            expect(cardStyles.padded).toBeDefined();
            expect(cardStyles.soft).toBeDefined();
            expect(cardStyles.muted).toBeDefined();
            expect(cardStyles.interactive).toBeDefined();
        });
    });

    describe('inputStyles', () => {
        it('has base and state styles', () => {
            expect(inputStyles.base).toBeDefined();
            expect(inputStyles.default).toBeDefined();
            expect(inputStyles.error).toBeDefined();
            expect(inputStyles.disabled).toBeDefined();
        });
    });

    describe('getInputClasses', () => {
        it('returns default state classes', () => {
            const classes = getInputClasses();

            expect(classes).toContain(inputStyles.base);
            expect(classes).toContain(inputStyles.default);
        });

        it('returns error state classes', () => {
            const classes = getInputClasses('error');

            expect(classes).toContain(inputStyles.error);
        });

        it('returns disabled state classes', () => {
            const classes = getInputClasses('disabled');

            expect(classes).toContain(inputStyles.disabled);
        });
    });

    describe('badgeStyles', () => {
        it('has base and variant styles', () => {
            expect(badgeStyles.base).toBeDefined();
            expect(badgeStyles.variants.primary).toBeDefined();
            expect(badgeStyles.variants.success).toBeDefined();
            expect(badgeStyles.variants.warning).toBeDefined();
            expect(badgeStyles.variants.error).toBeDefined();
            expect(badgeStyles.variants.neutral).toBeDefined();
        });
    });

    describe('getBadgeClasses', () => {
        it('returns default variant classes', () => {
            const classes = getBadgeClasses();

            expect(classes).toContain(badgeStyles.base);
            expect(classes).toContain(badgeStyles.variants.primary);
        });

        it('returns specified variant classes', () => {
            const classes = getBadgeClasses('success');

            expect(classes).toContain(badgeStyles.variants.success);
        });
    });

    describe('modalStyles', () => {
        it('has all modal parts', () => {
            expect(modalStyles.overlay).toBeDefined();
            expect(modalStyles.container).toBeDefined();
            expect(modalStyles.content).toBeDefined();
            expect(modalStyles.header).toBeDefined();
            expect(modalStyles.body).toBeDefined();
            expect(modalStyles.footer).toBeDefined();
        });
    });

    describe('typographyStyles', () => {
        it('has all typography variants', () => {
            expect(typographyStyles.eyebrow).toBeDefined();
            expect(typographyStyles.label).toBeDefined();
            expect(typographyStyles.sectionTitle).toBeDefined();
            expect(typographyStyles.heading1).toBeDefined();
            expect(typographyStyles.heading2).toBeDefined();
            expect(typographyStyles.heading3).toBeDefined();
            expect(typographyStyles.body).toBeDefined();
            expect(typographyStyles.caption).toBeDefined();
            expect(typographyStyles.muted).toBeDefined();
        });
    });

    describe('layoutStyles', () => {
        it('has all layout variants', () => {
            expect(layoutStyles.appShell).toBeDefined();
            expect(layoutStyles.pageShell).toBeDefined();
            expect(layoutStyles.navSurface).toBeDefined();
            expect(layoutStyles.navContainer).toBeDefined();
        });
    });

    describe('spacing', () => {
        it('has all spacing values', () => {
            expect(spacing.xs).toBe('0.25rem');
            expect(spacing.sm).toBe('0.5rem');
            expect(spacing.md).toBe('1rem');
            expect(spacing.lg).toBe('1.5rem');
            expect(spacing.xl).toBe('2rem');
            expect(spacing['2xl']).toBe('3rem');
        });
    });

    describe('transitionStyles', () => {
        it('has all transition variants', () => {
            expect(transitionStyles.default).toBeDefined();
            expect(transitionStyles.fast).toBeDefined();
            expect(transitionStyles.slow).toBeDefined();
            expect(transitionStyles.colors).toBeDefined();
        });
    });

    describe('macroColors', () => {
        it('has colors for all macros', () => {
            expect(macroColors.calories).toBeDefined();
            expect(macroColors.protein).toBeDefined();
            expect(macroColors.carbs).toBeDefined();
            expect(macroColors.fat).toBeDefined();
        });

        it('each macro has bg, text, and light properties', () => {
            const macros = ['calories', 'protein', 'carbs', 'fat'] as const;

            macros.forEach(macro => {
                expect(macroColors[macro].bg).toBeDefined();
                expect(macroColors[macro].text).toBeDefined();
                expect(macroColors[macro].light).toBeDefined();
            });
        });
    });

    describe('colors', () => {
        it('has primary color palette', () => {
            expect(colors.primary).toBeDefined();
            expect(colors.primary[50]).toBeDefined();
            expect(colors.primary[500]).toBeDefined();
            expect(colors.primary[900]).toBeDefined();
        });

        it('has status colors', () => {
            expect(colors.status.success).toBeDefined();
            expect(colors.status.warning).toBeDefined();
            expect(colors.status.error).toBeDefined();
            expect(colors.status.info).toBeDefined();
        });
    });
});

