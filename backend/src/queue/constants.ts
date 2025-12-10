/**
 * Queue name constants
 */
export const QUEUE_NAMES = {
  CODE_GENERATION: 'code-generation',
  CODE_MODIFICATION: 'code-modification',
  PLAN_GENERATION: 'plan-generation',
  CODE_REVIEW: 'code-review',
  TEST_GENERATION: 'test-generation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
