/** Adapted source excerpt, E03. Extracted event-key selection with types and a function boundary added.
 * Actual configured actions are omitted. Selecting a rule does not execute suppression. */
export function ruleKey(channel: string, event: string): string {
  const positiveReplyEvents = ['replied', 'interested_reply', 'positive_reply', 'info_request',
    'information_request', 'objection_price', 'objection_timing', 'objection_scope',
    'meeting_request', 'referral'];
  if (positiveReplyEvents.includes(event)) return 'on_' + channel + '_reply';
  if (event === 'meeting_booked') return 'on_meeting_booked';
  if (event === 'not_interested') return 'on_not_interested';
  return 'unknown';
}
