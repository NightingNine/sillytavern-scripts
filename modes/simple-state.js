export const SIMPLE_STORAGE_KEY = 'auto-card-studio:simple-mode:v1';
export const fields = [
    ['aiRole', 'AI 身份', '角色创作助手', false],
    ['aiPersona', 'AI 人设', '', true],
    ['creatorRole', '创作者身份', '创作者', false],
    ['systemPrompt', '系统提示词', '根据创作者的要求协助设计角色。', true],
    ['language', '输出语言', '中文', false],
    ['person', '叙述人称', '第三人称', false],
    ['wordCount', '篇幅偏好', '', false],
];
export function normalizeSimpleState(raw = {}) {
    return {
        definitions: Object.fromEntries(fields.map(([key, , fallback]) => [key,
            typeof raw?.definitions?.[key] === 'string' ? raw.definitions[key] : fallback])),
        draft: typeof raw?.draft === 'string' ? raw.draft : '',
        turns: Array.isArray(raw?.turns) ? raw.turns.filter(turn =>
            ['user', 'assistant'].includes(turn?.role) && typeof turn.content === 'string')
            .map(({ role, content }) => ({ role, content })) : [],
    };
}
export function buildSimpleRequest(state, generationId) {
    const definitions = fields.filter(([key]) => state.definitions[key]?.trim())
        .map(([key, label]) => `${label}：${state.definitions[key].trim()}`).join('\n\n');
    return {
        generation_id: generationId, user_input: state.draft,
        should_stream: false, should_silence: true,
        ordered_prompts: [{ role: 'system', content: definitions }, ...state.turns, 'user_input'],
        overrides: {
            chat_history: { prompts: [], with_depth_entries: false, author_note: '' },
            char_description: '', char_personality: '', scenario: '', persona_description: '',
            dialogue_examples: '', world_info_before: '', world_info_after: '',
        },
    };
}
