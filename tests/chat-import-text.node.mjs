/* eslint-disable playwright/expect-expect -- These Node tests use strict assertions. */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { importTextChat, parseTextChat } from '../src/chat-import-text.js';

describe('plain-text chat import', () => {
    test('parses labelled Chinese messages and seeds Qvink with existing summaries', () => {
        const text = [
            '用户：去车站。',
            '助手：林遥收好地图。',
            '## 剧情总结',
            '林遥与用户决定去车站，并带上地图。',
            '用户：继续。',
            'AI：他们抵达站台。',
            '【新通用总结】：双方已抵达站台，地图仍由林遥保管。',
        ].join('\n');

        const chat = parseTextChat('用户甲', '林遥', text);
        const header = chat[0];
        const messages = chat.slice(1);

        assert.equal(messages.length, 4);
        assert.deepEqual(messages.map(message => message.is_user), [true, false, true, false]);
        assert.deepEqual({
            memory: messages[1].extra.qvink_memory.memory,
            remember: messages[1].extra.qvink_memory.remember,
            exclude: messages[1].extra.qvink_memory.exclude,
        }, {
            memory: '【剧情总结】\n林遥与用户决定去车站，并带上地图。',
            remember: false,
            exclude: true,
        });
        assert.match(messages[3].extra.qvink_memory.memory, /双方已抵达站台/);
        assert.equal(messages[3].extra.qvink_memory.remember, true);
        assert.equal(messages[3].extra.qvink_memory.exclude, false);
        assert.equal(messages.every(message => !message.mes.includes('剧情总结')), true);
        assert.deepEqual({
            message_count: header.chat_metadata.txt_import.message_count,
            speaker_marker_count: header.chat_metadata.txt_import.speaker_marker_count,
            summary_count: header.chat_metadata.txt_import.summary_count,
            recent_message_window: header.chat_metadata.txt_import.recent_message_window,
        }, {
            message_count: 4,
            speaker_marker_count: 4,
            summary_count: 2,
            recent_message_window: 16,
        });
        assert.equal(header.chat_metadata.qvink_memory.enabled, true);
    });

    test('uses stage summaries as short-term memory when no cumulative summary exists', () => {
        const chat = parseTextChat('User', 'Character', 'User: one\nAssistant: two\n剧情总结：阶段事件');
        assert.equal(chat[2].extra.qvink_memory.remember, true);
        assert.equal(chat[2].extra.qvink_memory.exclude, false);
    });

    test('recognizes an English cumulative summary heading', () => {
        const chat = parseTextChat('User', 'Character', 'Assistant: event\nNew General Summary: persistent facts');
        assert.equal(chat[1].extra.qvink_memory.remember, true);
        assert.equal(chat[1].extra.qvink_memory.memory, '【New General Summary】\npersistent facts');
    });

    test('preserves unlabelled prose as one character message', () => {
        const chat = parseTextChat('User', 'Character', '第一段。\n\n第二段。');
        assert.equal(chat.length, 2);
        assert.equal(chat[1].name, 'Character');
        assert.equal(chat[1].is_user, false);
        assert.equal(chat[1].mes, '第一段。\n\n第二段。');
    });

    test('serializes every imported object as valid JSONL', () => {
        const result = importTextChat('User', 'Character', 'User: hello\nAssistant: hi');
        const lines = result.split('\n').map(line => JSON.parse(line));
        assert.equal(lines.length, 3);
        assert.equal(lines[2].mes, 'hi');
    });
});
