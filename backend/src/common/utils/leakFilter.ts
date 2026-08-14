export const filterContactLeaking = (text: string): { content: string; filtered: boolean } => {
  let isFiltered = false;

  // Pattern for matching emails with typical obfuscations: [at], (at), {at}, at, [dot], (dot), {dot}, dot
  const emailObfuscatedPattern = /[a-zA-Z0-9._%+-]+\s*(?:@|\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\}|\bat\b)\s*[a-zA-Z0-9.-]+\s*(?:\.|\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|\bdot\b)\s*[a-zA-Z]{2,}/gi;

  // Pattern for matching phone numbers (7 to 15 digits) with spaces, dashes, or dots separating digits
  const phoneObfuscatedPattern = /(?:\+?\d[\s.-]?){7,15}/g;

  let content = text;

  if (emailObfuscatedPattern.test(content)) {
    content = content.replace(emailObfuscatedPattern, '[EMAIL REMOVED]');
    isFiltered = true;
  }

  if (phoneObfuscatedPattern.test(content)) {
    content = content.replace(phoneObfuscatedPattern, '[PHONE NUMBER REMOVED]');
    isFiltered = true;
  }

  return {
    content,
    filtered: isFiltered
  };
};
