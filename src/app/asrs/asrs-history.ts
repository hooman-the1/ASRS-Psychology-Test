import { SeverityCategory } from './asrs.constants';
import {
  getEmojiIcon,
  getGaugeColor,
  getRecommendationText,
  getSeverityCategory,
  getSeverityText,
} from './asrs.helpers';

export const ASRS_HISTORY_STORAGE_KEY = 'asrs:history';

export interface AsrsHistoryResultV1 {
  severityText: string;
  emoji: string;
  recommendationText: string;
  gaugeColor: string;
  warningText: null;
}

export interface AsrsHistoryRecordV1 {
  id: string;
  submittedAt: string;
  answers: number[];
  totalScore: number;
  severityCategory: SeverityCategory;
  result: AsrsHistoryResultV1;
}

export interface AsrsHistoryV1 {
  version: 1;
  records: AsrsHistoryRecordV1[];
}

const envelopeFields = ['version', 'records'];
const recordFields = ['id', 'submittedAt', 'answers', 'totalScore', 'severityCategory', 'result'];
const resultFields = ['severityText', 'emoji', 'recommendationText', 'gaugeColor', 'warningText'];

function generateLocalId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyFields(value: Record<string, unknown>, fields: string[]): boolean {
  return Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
}

function hasValidAnswers(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 18 &&
    value.every(answer => Number.isInteger(answer) && answer >= 0 && answer <= 4);
}

function isUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const normalized = value.includes('.') ? value.replace(/\.(\d+)Z$/, (_, digits: string) => `.${digits.padEnd(3, '0')}Z`)
    : value.replace(/Z$/, '.000Z');
  return parsed.toISOString() === normalized;
}

function isResultV1(value: unknown): value is AsrsHistoryResultV1 {
  return isObject(value) && hasOnlyFields(value, resultFields) &&
    typeof value['severityText'] === 'string' &&
    typeof value['emoji'] === 'string' &&
    typeof value['recommendationText'] === 'string' &&
    typeof value['gaugeColor'] === 'string' && /^#[0-9a-fA-F]{6}$/.test(value['gaugeColor']) &&
    value['warningText'] === null;
}

function isRecordV1(value: unknown): value is AsrsHistoryRecordV1 {
  if (!isObject(value) || !hasOnlyFields(value, recordFields) ||
    typeof value['id'] !== 'string' || value['id'].trim().length === 0 ||
    !isUtcTimestamp(value['submittedAt']) || !hasValidAnswers(value['answers']) ||
    typeof value['totalScore'] !== 'number' || !Number.isInteger(value['totalScore']) ||
    value['totalScore'] < 0 || value['totalScore'] > 72 ||
    !isResultV1(value['result'])) return false;

  const score = value['answers'].reduce((total, answer) => total + answer, 0);
  return value['totalScore'] === score && value['severityCategory'] === getSeverityCategory(score);
}

/** Validate parsed browser data before treating it as a v1 history. */
export function isAsrsHistoryV1(value: unknown): value is AsrsHistoryV1 {
  if (!isObject(value) || !hasOnlyFields(value, envelopeFields) || value['version'] !== 1 ||
    !Array.isArray(value['records'])) return false;
  const ids = new Set<string>();
  for (const record of value['records']) {
    if (!isRecordV1(record) || ids.has(record.id)) return false;
    ids.add(record.id);
  }
  return true;
}

/** Build a new snapshot before the form is reset; the caller supplies existing IDs. */
export function createAsrsHistoryRecord(
  answers: readonly number[],
  existingIds: ReadonlySet<string> = new Set(),
  submittedAt: Date = new Date(),
  generateId: () => string = generateLocalId,
): AsrsHistoryRecordV1 {
  if (!hasValidAnswers(answers)) throw new Error('Invalid ASRS answers');
  const id = generateId();
  if (typeof id !== 'string' || id.trim().length === 0 || existingIds.has(id)) {
    throw new Error('Invalid or duplicate ASRS record ID');
  }
  const timestamp = submittedAt.toISOString();
  const totalScore = answers.reduce((total, answer) => total + answer, 0);
  const severityCategory = getSeverityCategory(totalScore);
  return {
    id,
    submittedAt: timestamp,
    answers: [...answers],
    totalScore,
    severityCategory,
    result: {
      severityText: getSeverityText(severityCategory),
      emoji: getEmojiIcon(severityCategory),
      recommendationText: getRecommendationText(severityCategory),
      gaugeColor: getGaugeColor(severityCategory),
      warningText: null,
    },
  };
}
