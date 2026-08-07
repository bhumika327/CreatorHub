export const filterContactLeaking = (text: string): string => {
  // Regex pattern for matching typical phone numbers (e.g. +1-555-555-5555, 555 555 5555, etc.)
  const phonePattern = /(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
  
  // Regex pattern for matching emails
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  return text
    .replace(phonePattern, '[PHONE NUMBER REMOVED]')
    .replace(emailPattern, '[EMAIL REMOVED]');
};
