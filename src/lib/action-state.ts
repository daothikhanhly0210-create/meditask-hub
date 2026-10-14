export type FieldErrors = Record<string, string[]>;

/**
 * Unified shape returned by every server action so client forms can render
 * errors consistently. `message` and field error values are i18n keys.
 */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
};

export const idleState: ActionState = { ok: false };

export function errorState(message: string, fieldErrors?: FieldErrors): ActionState {
  return { ok: false, message, fieldErrors };
}

export function successState(message?: string): ActionState {
  return { ok: true, message };
}
