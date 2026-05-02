const LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function buildNameMap(names) {
  const map = {};
  names.forEach((name, i) => {
    if (name && i < LABELS.length) map[name] = `학생${LABELS[i]}`;
  });
  return map;
}

export function anonymize(text, nameMap) {
  let result = text;
  for (const [real, placeholder] of Object.entries(nameMap)) {
    result = result.replaceAll(real, placeholder);
  }
  return result;
}

export function deanonymize(text, nameMap) {
  let result = text;
  for (const [real, placeholder] of Object.entries(nameMap)) {
    result = result.replaceAll(placeholder, real);
  }
  return result;
}
