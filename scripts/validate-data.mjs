#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const TOPIC_ID_PATTERN = /^topic-\d{3,}$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    errors.push(`${path}: failed to parse — ${err.message}`);
    return null;
  }
}

// --- categories.json ---
const categories = readJson('data/categories.json');
const categoryIds = new Set();

if (Array.isArray(categories)) {
  check(categories.length >= 1, 'categories.json: must have at least 1 entry');

  for (const [i, category] of categories.entries()) {
    if (!isRecord(category)) {
      errors.push(`categories[${i}]: must be an object`);
      continue;
    }
    const ctx = `categories[${i}] (id=${category.id ?? '?'})`;

    check(
      typeof category.id === 'string' && category.id.length > 0,
      `${ctx}: id must be non-empty string`,
    );
    check(!categoryIds.has(category.id), `${ctx}: duplicate id`);
    categoryIds.add(category.id);

    check(
      typeof category.label === 'string' && category.label.length > 0,
      `${ctx}: label must be non-empty string`,
    );

    for (const scheme of ['light', 'dark']) {
      const colors = category.colors?.[scheme];
      if (!isRecord(colors)) {
        errors.push(`${ctx}: colors.${scheme} must be an object`);
        continue;
      }
      for (const key of ['bg', 'text']) {
        check(
          typeof colors[key] === 'string' && COLOR_PATTERN.test(colors[key]),
          `${ctx}: colors.${scheme}.${key} must be a hex color like #rrggbb`,
        );
      }
    }
  }
} else if (categories !== null) {
  errors.push('categories.json: root must be an array');
}

// --- topics.json ---
const topics = readJson('data/topics.json');
const topicIds = new Set();

if (Array.isArray(topics)) {
  const texts = new Set();
  for (const [i, topic] of topics.entries()) {
    if (!isRecord(topic)) {
      errors.push(`topics[${i}]: must be an object`);
      continue;
    }
    const ctx = `topics[${i}] (id=${topic.id ?? '?'})`;

    check(
      typeof topic.id === 'string' && TOPIC_ID_PATTERN.test(topic.id),
      `${ctx}: id must match /topic-\\d{3,}/`,
    );
    check(!topicIds.has(topic.id), `${ctx}: duplicate id`);
    topicIds.add(topic.id);

    check(
      categoryIds.has(topic.category),
      `${ctx}: unknown category "${topic.category}" (expected one of ${[...categoryIds].join(', ')})`,
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
    if (!isRecord(style)) {
      errors.push(`styles[${i}]: must be an object`);
      continue;
    }
    const ctx = `styles[${i}] (id=${style.id ?? '?'})`;

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
  if (isRecord(excluded) && Array.isArray(excluded.excluded_ids)) {
    for (const id of excluded.excluded_ids) {
      check(topicIds.has(id), `excluded_ids.json: "${id}" does not reference any topic`);
    }
  } else {
    errors.push('excluded_ids.json: excluded_ids must be an array');
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
const categoryCount = Array.isArray(categories) ? categories.length : 0;
const excludedCount = excluded?.excluded_ids?.length ?? 0;
console.log(
  `✓ validated ${topicCount} topics / ${categoryCount} categories / ${styleCount} styles / ${excludedCount} excluded`,
);
