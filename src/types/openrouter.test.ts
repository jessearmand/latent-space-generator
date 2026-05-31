import { describe, it, expect } from 'vitest';
import { getProviderFromId, getUniqueProviders, filterModels } from './openrouter';
import type { OpenRouterModel } from './openrouter';

describe('getProviderFromId', () => {
    it('returns the prefix before the slash', () => {
        expect(getProviderFromId('google/gemini-3-flash')).toBe('google');
        expect(getProviderFromId('anthropic/claude-opus-4')).toBe('anthropic');
        expect(getProviderFromId('openai/gpt-5')).toBe('openai');
    });

    it("strips OpenRouter's `~` alias prefix so always-redirect models fold into the canonical vendor", () => {
        // OpenRouter aliases like `~anthropic/claude-haiku-latest` redirect to the latest
        // model in the family. They should show up under the same provider filter as
        // their canonical sibling, not as a separate `~anthropic` bucket.
        expect(getProviderFromId('~anthropic/claude-haiku-latest')).toBe('anthropic');
        expect(getProviderFromId('~google/gemini-latest')).toBe('google');
        expect(getProviderFromId('~moonshotai/kimi-latest')).toBe('moonshotai');
        expect(getProviderFromId('~openai/gpt-latest')).toBe('openai');
    });

    it('falls back to "unknown" for empty input', () => {
        expect(getProviderFromId('')).toBe('unknown');
    });
});

const stub = (id: string): OpenRouterModel => ({
    id,
    name: id,
    pricing: { prompt: '0', completion: '0' },
    architecture: {
        modality: 'text->text',
        input_modalities: ['text'],
        output_modalities: ['text'],
        tokenizer: 'Other',
        instruct_type: '',
    },
    top_provider: { context_length: 0, max_completion_tokens: 0, is_moderated: false },
});

describe('getUniqueProviders', () => {
    it('deduplicates `~`-aliased and canonical entries into a single provider', () => {
        const models = [
            stub('anthropic/claude-opus-4'),
            stub('~anthropic/claude-haiku-latest'),
            stub('google/gemini-3'),
            stub('~google/gemini-latest'),
        ];
        expect(getUniqueProviders(models)).toEqual(['anthropic', 'google']);
    });
});

describe('filterModels by provider', () => {
    it('matches `~`-aliased models when the user filters by the canonical provider', () => {
        const models = [stub('anthropic/claude-opus-4'), stub('~anthropic/claude-haiku-latest'), stub('openai/gpt-5')];
        const filtered = filterModels(models, { provider: 'anthropic' });
        expect(filtered.map((m) => m.id)).toEqual(['anthropic/claude-opus-4', '~anthropic/claude-haiku-latest']);
    });

    it('still matches when the persisted filter itself carries a stale `~` prefix', () => {
        // Simulates a user whose localStorage was saved with `~anthropic` before
        // this fix — they'd otherwise see an empty list until manually resetting.
        const models = [stub('anthropic/claude-opus-4'), stub('~anthropic/claude-haiku-latest'), stub('openai/gpt-5')];
        const filtered = filterModels(models, { provider: '~anthropic' });
        expect(filtered.map((m) => m.id)).toEqual(['anthropic/claude-opus-4', '~anthropic/claude-haiku-latest']);
    });
});
