import { SEVERITY_LEVELS, SeverityCategory } from './asrs.constants';

export function getSeverityCategory(score: number): SeverityCategory {
    if (score <= 17) return 'minimal';
    if (score <= 27) return 'mild';
    if (score <= 36) return 'moderate';
    return 'severe';
}

export function getSeverityText(category: SeverityCategory): string {
    return SEVERITY_LEVELS[category]?.severity || '';
}

export function getRecommendationText(category: SeverityCategory): string {
    return SEVERITY_LEVELS[category]?.recommendation || '';
}

export function getGaugeColor(category: SeverityCategory): string {
    return SEVERITY_LEVELS[category]?.gaugeColor || '#000000';
}

export function getEmojiIcon(category: SeverityCategory): string {
    return SEVERITY_LEVELS[category]?.emoji || '';
}

export function getGaugeMarkers(value: number, color: string) {
    return {
        [value]: {
            color,
            type: 'triangle',
            size: 10,
            label: 'نمره شما',
        }
    };
}
