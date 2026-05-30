#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const VALID_CATEGORIES = new Set([
  'tools',
  'food',
  'hobby',
  'childhood',
  'travel',
  'bgm',
  'season',
  'lifestyle',
  'imagination',
  'gadget',
  'learning',
]);

const TOPIC_ID_PATTERN = /^topic-\d{3}$/;

const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    errors.push(`${path}: failed to parse — ${err.message}`);
    return null;
  }
}

// --- topics.json ---
const topics = readJson('data/topics.json');
const topicIds = new Set();

if (Array.isArray(topics)) {
  const texts = new Set();
  for (const [i, topic] of topics.entries()) {
    const ctx = `topics[${i}] (id=${topic?.id ?? '?'})`;

    check(
      typeof topic.id === 'string' && TOPIC_ID_PATTERN.test(topic.id),
      `${ctx}: id must match /topic-\\d{3}/`,
    );
    check(!topicIds.has(topic.id), `${ctx}: duplicate id`);
    topicIds.add(topic.id);

    check(
      VALID_CATEGORIES.has(topic.category),
      `${ctx}: unknown category "${topic.category}" (expected one of ${[...VALID_CATEGORIES].join(', ')})`,
    );

    check(
      typeof topic.text === 'string' && topic.text.length > 0,
      `${ctx}: text must be non-empty string`,
    );
    check(
      typeof topic.text === 'string' && topic.text.endsWith('？'),
      `${ctx}: text must end with ？`,
    );
    check(!texts.has(topic.text), `${ctx}: duplicate text "${topic.text}"`);
    texts.add(topic.text);
  }
} else if (topics !== null) {
  errors.push('topics.json: root must be an array');
}

// --- styles.json ---
const styles = readJson('data/styles.json');
if (Array.isArray(styles)) {
  check(styles.length >= 1, 'styles.json: must have at least 1 entry');

  const styleIds = new Set();
  for (const [i, style] of styles.entries()) {
    const ctx = `styles[${i}] (id=${style?.id ?? '?'})`;

    check(
      typeof style.id === 'string' && style.id.length > 0,
      `${ctx}: id must be non-empty string`,
    );
    check(!styleIds.has(style.id), `${ctx}: duplicate id`);
    styleIds.add(style.id);

    check(
      typeof style.name === 'string' && style.name.length > 0,
      `${ctx}: name must be non-empty string`,
    );
    check(
      typeof style.description === 'string' && style.description.length > 0,
      `${ctx}: description must be non-empty string`,
    );
  }
} else if (styles !== null) {
  errors.push('styles.json: root must be an array');
}

// --- excluded_ids.json ---
const excluded = readJson('data/excluded_ids.json');
if (excluded !== null) {
  check(Array.isArray(excluded.excluded_ids), 'excluded_ids.json: excluded_ids must be an array');

  if (Array.isArray(excluded.excluded_ids)) {
    for (const id of excluded.excluded_ids) {
      check(topicIds.has(id), `excluded_ids.json: "${id}" does not reference any topic`);
    }
  }
}

// --- result ---
if (errors.length > 0) {
  console.error(`✘ Validation failed (${errors.length} error${errors.length === 1 ? '' : 's'}):`);
  for (const err of errors) console.error('  -', err);
  process.exit(1);
}

const topicCount = Array.isArray(topics) ? topics.length : 0;
const styleCount = Array.isArray(styles) ? styles.length : 0;
const excludedCount = excluded?.excluded_ids?.length ?? 0;
console.log(`✓ validated ${topicCount} topics / ${styleCount} styles / ${excludedCount} excluded`);
