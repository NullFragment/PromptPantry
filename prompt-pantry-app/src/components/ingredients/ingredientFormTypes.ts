import type { ContainerSize, IngredientConversions } from '../../types';

export interface EditFormData {
    name: string;
    storeSectionId: string;
    aliases: string[];
    containerSizes: ContainerSize[];
    conversions: IngredientConversions;
    [key: string]: unknown;
}

export const DEFAULT_FORM_DATA: EditFormData = {
    name: '',
    storeSectionId: '',
    aliases: [],
    containerSizes: [],
    conversions: {}
};
