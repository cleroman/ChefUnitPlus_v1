// ChefUnitPlus - Test des formats de reference
const OPERATORS = {
  airtel:   { name: 'Airtel Money',   regex: /^MP\d{8}$/, example: 'MP2409211234' },
  vodacom:  { name: 'Vodacom M-Pesa', regex: /^MP\d{8}$/, example: 'MP2409215678' },
  orange:   { name: 'Orange Money',   regex: /^OM\d{8}$/, example: 'OM2409219012' },
  africell: { name: 'Africell Money', regex: /^AF\d{8}$/, example: 'AF2409213456' },
};

console.log('');
console.log('=== TEST DES FORMATS DE REFERENCE ===');
console.log('');

const validTests = [
  { op: 'airtel',   ref: 'MP2409211234', expected: true },
  { op: 'vodacom',  ref: 'MP2409215678', expected: true },
  { op: 'orange',   ref: 'OM2409219012', expected: true },
  { op: 'africell', ref: 'AF2409213456', expected: true },
];

const invalidTests = [
  { op: 'airtel',   ref: 'MP24092112',    expected: false, reason: 'trop court' },
  { op: 'orange',   ref: 'MP2409211234',  expected: false, reason: 'mauvais prefixe' },
  { op: 'vodacom',  ref: '2409215678',    expected: false, reason: 'manque MP' },
  { op: 'africell', ref: 'AF24092134567', expected: false, reason: 'trop long' },
  { op: 'airtel',   ref: 'mp2409211234',  expected: false, reason: 'minuscules' },
];

let pass = 0, fail = 0;

console.log('--- Tests valides ---');
validTests.forEach(t => {
  const op = OPERATORS[t.op];
  const normalized = t.ref.replace(/\s/g, '').toUpperCase();
  const result = op.regex.test(normalized);
  const status = result === t.expected ? 'OK' : 'XX';
  if (result === t.expected) pass++; else fail++;
  console.log(`  [${status}] ${t.op.padEnd(10)} | ${t.ref.padEnd(15)} | ${result}`);
});

console.log('');
console.log('--- Tests invalides ---');
invalidTests.forEach(t => {
  const op = OPERATORS[t.op];
  const normalized = t.ref.replace(/\s/g, '').toUpperCase();
  const result = op.regex.test(normalized);
  const status = result === t.expected ? 'OK' : 'XX';
  if (result === t.expected) pass++; else fail++;
  console.log(`  [${status}] ${t.op.padEnd(10)} | ${t.ref.padEnd(15)} | ${result} (${t.reason})`);
});

console.log('');
console.log('=== RESULTAT ===');
console.log(`  Pass : ${pass}`);
console.log(`  Fail : ${fail}`);
console.log('');