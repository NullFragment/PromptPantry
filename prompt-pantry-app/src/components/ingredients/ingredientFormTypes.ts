import type { ContainerSize, IngredientConversions } from '../../types';

export interface EditFormData {
    name: string;
    storeSection: string;
    aliases: string[];
    containerSizes: ContainerSize[];
    conversions: IngredientConversions;
    isNewSection: boolean;
    newSectionName: string;
    [key: string]: unknown;
}

export const DEFAULT_FORM_DATA: EditFormData = {
    name: '',
    storeSection: 'Unassigned',
    aliases: [],
    containerSizes: [],
    conversions: {},
    isNewSection: false,
    newSectionName: ''
};
