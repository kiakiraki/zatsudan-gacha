import test from 'node:test';
import assert from 'node:assert/strict';
import { pickStyle, pickTopics, shuffle } from '../src/client/gacha.ts';

const ITERATIONS = 200;

function makeTopics(spec) {
  // spec: { category: count } → [{ id, category, text }]
  const topics = [];
  let n = 0;
  for (const [category, count] of Object.entries(spec)) {
    for (let i = 0; i < count; i++) {
      n++;
      const id = `topic-${String(n).padStart(3, '0')}`;
      topics.push({ id, category, text: `${id} のネタ？` });
    }
  }
  return topics;
}

test('shuffle: 要素の集合と数を保つ', () => {
  const input = [1, 2, 3, 4, 5];
  for (let i = 0; i < ITERATIONS; i++) {
    const result = shuffle(input);
    assert.equal(result.length, input.length);
    assert.deepEqual([...result].sort(), [...input].sort());
  }
  assert.deepEqual(input, [1, 2, 3, 4, 5], '元の配列を破壊しない');
});

test('pickStyle: 空配列は例外', () => {
  assert.throws(() => pickStyle([]));
});

test('pickStyle: 1個しかなければ current と同じでもそれを返す', () => {
  const only = { id: 'a', name: 'A', description: '' };
  assert.equal(pickStyle([only], only), only);
});

test('pickStyle: 直前のスタイルは選ばれない', () => {
  const styles = [
    { id: 'a', name: 'A', description: '' },
    { id: 'b', name: 'B', description: '' },
    { id: 'c', name: 'C', description: '' },
  ];
  const current = styles[0];
  for (let i = 0; i < ITERATIONS; i++) {
    assert.notEqual(pickStyle(styles, current).id, current.id);
  }
});

test('pickTopics: 指定個数を重複なく返す', () => {
  const topics = makeTopics({ a: 10, b: 10, c: 10, d: 10, e: 10 });
  for (let i = 0; i < ITERATIONS; i++) {
    const picked = pickTopics(topics, new Set(), 9, 2);
    assert.equal(picked.length, 9);
    assert.equal(new Set(picked.map((t) => t.id)).size, 9);
  }
});

test('pickTopics: 同一カテゴリは maxPerCategory まで', () => {
  const topics = makeTopics({ a: 20, b: 20, c: 20, d: 20, e: 20 });
  for (let i = 0; i < ITERATIONS; i++) {
    const picked = pickTopics(topics, new Set(), 9, 2);
    const perCategory = {};
    for (const t of picked) {
      perCategory[t.category] = (perCategory[t.category] ?? 0) + 1;
      assert.ok(perCategory[t.category] <= 2, `category ${t.category} exceeded cap`);
    }
  }
});

test('pickTopics: 除外 id は選ばれない', () => {
  const topics = makeTopics({ a: 10, b: 10 });
  const excluded = new Set(topics.slice(0, 5).map((t) => t.id));
  for (let i = 0; i < ITERATIONS; i++) {
    const picked = pickTopics(topics, excluded, 9, 2);
    for (const t of picked) {
      assert.ok(!excluded.has(t.id), `excluded topic ${t.id} was picked`);
    }
  }
});

test('pickTopics: カテゴリ制限で埋まらない場合は制限を緩和して count 個返す', () => {
  // カテゴリ2種 × 上限2 = 4個までしか通常選出できないが、9個要求 → 緩和して埋める
  const topics = makeTopics({ a: 10, b: 10 });
  for (let i = 0; i < ITERATIONS; i++) {
    const picked = pickTopics(topics, new Set(), 9, 2);
    assert.equal(picked.length, 9);
    assert.equal(new Set(picked.map((t) => t.id)).size, 9);
  }
});

test('pickTopics: プールが count 未満なら全件返す', () => {
  const topics = makeTopics({ a: 3, b: 2 });
  const picked = pickTopics(topics, new Set(), 9, 2);
  assert.equal(picked.length, 5);
  assert.equal(new Set(picked.map((t) => t.id)).size, 5);
});
