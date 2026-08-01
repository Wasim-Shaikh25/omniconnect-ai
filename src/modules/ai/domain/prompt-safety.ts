/**
 * Prompt-safety utilities. These functions are pure text transforms (no IO,
 * no framework imports) so they live in the domain layer and can be unit-tested
 * without mocking an LLM provider.
 */

const USER_MESSAGE_START = "<<<USER_MESSAGE>>>";
const USER_MESSAGE_END = "<<</USER_MESSAGE>>>";

function dataStart(type: string): string {
  // Normalise the type so it cannot contain delimiter-breaking characters.
  const safeType = type.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  return `<<<${safeType}>>>`;
}

function dataEnd(type: string): string {
  const safeType = type.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  return `<<</${safeType}>>>`;
}

/**
 * Escape characters that can start or end an XML/HTML-style delimiter tag.
 * This prevents a user-editable fragment from closing a trusted region.
 */
export function escapePromptDelimiters(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Sanitise a prompt fragment (system prompt, tone, strategy, escalation rule,
 * template) so it cannot inject delimiter sequences.
 */
export function sanitizePromptFragment(value: string): string {
  return escapePromptDelimiters(value);
}

export function wrapUserMessage(content: string): string {
  return `${USER_MESSAGE_START}\n${escapePromptDelimiters(content)}\n${USER_MESSAGE_END}`;
}

export function wrapExternalData(type: string, content: string): string {
  return `${dataStart(type)}\n${escapePromptDelimiters(content)}\n${dataEnd(type)}`;
}
