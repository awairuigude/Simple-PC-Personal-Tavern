const QVINK_MODULE_NAME = 'qvink_memory';

const USER_ALIASES = [
    'user', 'human', 'you', 'player', 'me', '用户', '玩家', '我', '本人', '提问者', '{{user}}',
];

const CHARACTER_ALIASES = [
    'assistant', 'ai', 'bot', 'character', 'char', 'model', '助手', '角色', '模型', 'ai助手', '{{char}}',
];

const SUMMARY_ALIASES = [
    '剧情总结', '新通用总结', '通用总结', '阶段总结', '本轮总结', '故事总结', '对话总结',
    '历史总结', '前情总结', '前情提要', '剧情梗概', '总结', 'summary', 'plotsummary',
    'storysummary', 'conversationsummary', 'recap', 'newgeneralsummary', 'generalsummary',
    'stagesummary', 'roundsummary',
];

const CUMULATIVE_SUMMARY_ALIASES = [
    '新通用总结', '通用总结', '历史总结', '前情总结', '前情提要', '剧情梗概',
    'summary', 'plotsummary', 'storysummary', 'conversationsummary', 'recap',
    'newgeneralsummary', 'generalsummary', 'stagesummary', 'roundsummary',
];

function stripMarkerDecoration(value) {
    let result = String(value ?? '').trim();
    result = result.replace(/^\s*(?:>\s*)?(?:#{1,6}\s*)?(?:[-*+]\s+)?/, '');

    const wrappers = [
        ['**', '**'], ['__', '__'], ['【', '】'], ['[', ']'], ['（', '）'], ['(', ')'], ['<', '>'],
    ];
    let changed = true;
    while (changed) {
        changed = false;
        for (const [start, end] of wrappers) {
            if (result.startsWith(start) && result.endsWith(end)) {
                result = result.slice(start.length, -end.length).trim();
                changed = true;
            }
        }
    }

    return result;
}

function normalizeLabel(value) {
    return stripMarkerDecoration(value)
        .replace(/\s*(?:\[[^\]]*\]|【[^】]*】|\([^)]*\)|（[^）]*）)\s*$/, '')
        .replace(/[\s_-]+/g, '')
        .toLowerCase();
}

function splitMarker(line) {
    const decorated = stripMarkerDecoration(line);
    const colonIndex = decorated.search(/[:：]/);
    if (colonIndex < 0) {
        return { label: decorated, content: '' };
    }

    return {
        label: decorated.slice(0, colonIndex),
        content: decorated.slice(colonIndex + 1).trimStart(),
    };
}

/**
 * Converts a plain-text transcript to SillyTavern chat objects.
 * Explicit summary blocks are stored as Qvink long-term memories on the
 * preceding message, while the full dialogue remains available in the chat.
 * @param {string} userName User persona name
 * @param {string} characterName Character name
 * @param {string} text Transcript text
 * @returns {object[]} SillyTavern chat objects, including the metadata header
 */
export function parseTextChat(userName, characterName, text) {
    const userAliases = new Set([normalizeLabel(userName), ...USER_ALIASES.map(normalizeLabel)].filter(Boolean));
    const characterAliases = new Set([normalizeLabel(characterName), ...CHARACTER_ALIASES.map(normalizeLabel)].filter(Boolean));
    const summaryAliases = new Set(SUMMARY_ALIASES.map(normalizeLabel));
    const cumulativeSummaryAliases = new Set(CUMULATIVE_SUMMARY_ALIASES.map(normalizeLabel));

    const getSpeakerMarker = (line) => {
        const marker = splitMarker(line);
        const label = normalizeLabel(marker.label);
        if (userAliases.has(label)) return { role: 'user', content: marker.content };
        if (characterAliases.has(label)) return { role: 'assistant', content: marker.content };
        return null;
    };

    const getSummaryMarker = (line) => {
        const marker = splitMarker(line);
        const label = normalizeLabel(marker.label);
        return summaryAliases.has(label)
            ? { title: stripMarkerDecoration(marker.label), content: marker.content }
            : null;
    };

    const messages = [];
    const pendingSummaries = [];
    const summaryTitles = new Set();
    let latestCumulativeMessage = null;
    let summaryCount = 0;
    let speakerMarkerCount = 0;
    let currentKind = 'message';
    let currentRole = null;
    let currentTitle = '';
    let currentLines = [];

    const setMemory = (message, messageIndex, cumulativeIndex) => {
        const importedSummaries = message.extra.txt_import.summaries;
        message.extra[QVINK_MODULE_NAME] = {
            memory: importedSummaries
                .map(item => `【${item.title}】\n${item.content}`)
                .join('\n\n'),
            remember: latestCumulativeMessage === null || messageIndex >= cumulativeIndex,
            exclude: latestCumulativeMessage !== null && messageIndex < cumulativeIndex,
            edited: true,
            error: null,
            reasoning: null,
            prefill: null,
        };
    };

    const setImportedMemories = () => {
        const cumulativeIndex = messages.indexOf(latestCumulativeMessage);
        for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
            const message = messages[messageIndex];
            if (!message.extra?.txt_import?.summaries?.length) continue;
            setMemory(message, messageIndex, cumulativeIndex);
        }
    };

    const attachSummary = (message, summary) => {
        if (!message.extra) message.extra = {};
        if (!message.extra.txt_import) message.extra.txt_import = {};
        if (!Array.isArray(message.extra.txt_import.summaries)) message.extra.txt_import.summaries = [];
        message.extra.txt_import.summaries.push(summary);

        if (summary.cumulative) {
            latestCumulativeMessage = message;
        }
    };

    const pushMessage = (content, role) => {
        const isUser = role === 'user';
        const message = {
            name: isUser ? userName : characterName,
            is_user: isUser,
            is_system: false,
            send_date: new Date(Date.now() + messages.length).toISOString(),
            mes: content,
            extra: {},
        };
        messages.push(message);

        while (pendingSummaries.length > 0) {
            attachSummary(message, pendingSummaries.shift());
        }
    };

    const pushSummary = (title, content) => {
        const summaryTitle = title || '剧情总结';
        const summary = {
            title: summaryTitle,
            content,
            cumulative: cumulativeSummaryAliases.has(normalizeLabel(summaryTitle)),
        };
        summaryCount++;
        summaryTitles.add(summary.title);

        const target = messages.at(-1);
        if (target) {
            attachSummary(target, summary);
        } else {
            pendingSummaries.push(summary);
        }
    };

    const flush = () => {
        const content = currentLines.join('\n').trim();
        currentLines = [];
        if (!content) return;

        if (currentKind === 'summary') {
            pushSummary(currentTitle, content);
        } else {
            pushMessage(content, currentRole);
        }
    };

    const normalizedText = String(text ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    for (const line of normalizedText.split('\n')) {
        const speakerMarker = getSpeakerMarker(line);
        if (speakerMarker) {
            flush();
            currentKind = 'message';
            currentRole = speakerMarker.role;
            currentTitle = '';
            currentLines = speakerMarker.content ? [speakerMarker.content] : [];
            speakerMarkerCount++;
            continue;
        }

        const summaryMarker = getSummaryMarker(line);
        if (summaryMarker) {
            flush();
            currentKind = 'summary';
            currentTitle = summaryMarker.title;
            currentLines = summaryMarker.content ? [summaryMarker.content] : [];
            continue;
        }

        currentLines.push(line);
    }
    flush();

    // A summary-only file still needs a message to carry Qvink's metadata.
    if (messages.length === 0 && pendingSummaries.length > 0) {
        pushMessage('已导入剧情总结。', 'assistant');
    }

    setImportedMemories();

    const chatMetadata = {
        imported_from: 'txt',
        txt_import: {
            parser_version: 2,
            source_bytes: Buffer.byteLength(normalizedText, 'utf8'),
            message_count: messages.length,
            speaker_marker_count: speakerMarkerCount,
            summary_count: summaryCount,
            summary_titles: [...summaryTitles],
            recent_message_window: 16,
        },
        qvink_memory: {
            enabled: true,
        },
    };

    return [{
        chat_metadata: chatMetadata,
        user_name: 'unused',
        character_name: 'unused',
    }, ...messages];
}

/**
 * Serializes a plain-text transcript as SillyTavern JSONL.
 * @param {string} userName User persona name
 * @param {string} characterName Character name
 * @param {string} text Transcript text
 * @returns {string} SillyTavern JSONL chat
 */
export function importTextChat(userName, characterName, text) {
    return parseTextChat(userName, characterName, text)
        .map(object => JSON.stringify(object))
        .join('\n');
}
