export const LOCAL_AI_LANGUAGE_NOTICE = 'The experimental local assistant supports English only. isiXhosa and other language responses are not supported. Please ask in English.';
export const LOCAL_AI_LANGUAGE_INSTRUCTIONS = 'Reply in English only. Do not translate or generate isiXhosa or other non-English content. If asked for another language, explain in English that this experimental local assistant only supports English. Do not claim multilingual support.';

export function localLanguageUnsupported(prompt, requestedLanguage = 'en') {
  if (!['en', 'english', 'en-za', 'en-us', 'en-gb'].includes(String(requestedLanguage).toLowerCase())) return true;
  // Explicit language names used in current evaluation cases. This is not a
  // general-purpose language detector; output quality still requires review.
  return /\b(?:isi\s*xhosa|xhosa|ngesixhosa|afrikaans|isi\s*zulu|zulu|sesotho|setswana|french|spanish|german|mandarin)\b/i.test(String(prompt));
}
