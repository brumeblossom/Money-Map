// Current user getter/setter for guest vs authenticated user (PRD section 8)
let activeUserId: string | null = null;

export function getCurrentUserId(): string | null {
  return activeUserId;
}

export function setCurrentUserId(userId: string | null): void {
  activeUserId = userId;
}
