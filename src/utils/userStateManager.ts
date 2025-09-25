// User-based state management utility
// Handles localStorage reset when different user logs in

interface UserState {
  userId: string;
  lastLogin: string;
}

const USER_STATE_KEY = 'current_user_state';
const CONTEST_STATE_KEY = 'contest_state';
const CONTEST_RESULTS_KEY = 'contest_results';
const FINAL_CONTEST_RESULT_KEY = 'final_contest_result';
const INTERNET_VIOLATIONS_KEY = 'internet_violations';

export class UserStateManager {
  private static instance: UserStateManager;

  private constructor() {}

  static getInstance(): UserStateManager {
    if (!UserStateManager.instance) {
      UserStateManager.instance = new UserStateManager();
    }
    return UserStateManager.instance;
  }

  // Check if user has changed and reset state if needed
  checkAndResetUserState(newUserId: string): boolean {
    const currentUserState = this.getCurrentUserState();
    
    // If no previous user, this is first login - reset everything
    if (!currentUserState) {
      console.log(`First time user ${newUserId} logged in. Resetting all state.`);
      this.resetAllUserState();
      this.setCurrentUserState(newUserId);
      return true; // State was reset
    }
    
    // If different user, reset everything
    if (currentUserState.userId !== newUserId) {
      console.log(`User changed from ${currentUserState.userId} to ${newUserId}. Resetting all state.`);
      this.resetAllUserState();
      this.setCurrentUserState(newUserId);
      return true; // State was reset
    }
    
    // Same user logging in again - keep existing state
    console.log(`Same user ${newUserId} logged in. Keeping existing state.`);
    return false; // No reset needed
  }

  // Get current user state from localStorage
  private getCurrentUserState(): UserState | null {
    try {
      const stored = localStorage.getItem(USER_STATE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get current user state:', error);
      return null;
    }
  }

  // Set current user state in localStorage
  private setCurrentUserState(userId: string): void {
    const userState: UserState = {
      userId,
      lastLogin: new Date().toISOString()
    };
    localStorage.setItem(USER_STATE_KEY, JSON.stringify(userState));
  }

  // Reset all user-specific data
  private resetAllUserState(): void {
    // Clear all contest-related data
    localStorage.removeItem(CONTEST_STATE_KEY);
    localStorage.removeItem(CONTEST_RESULTS_KEY);
    localStorage.removeItem(FINAL_CONTEST_RESULT_KEY);
    localStorage.removeItem(INTERNET_VIOLATIONS_KEY);
    
    // Clear any other user-specific data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('contest_') ||
        key.startsWith('user_') ||
        key.startsWith('problem_') ||
        key.startsWith('submission_')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('All user state cleared from localStorage');
  }

  // Clear state when user logs out
  clearUserState(): void {
    this.resetAllUserState();
    localStorage.removeItem(USER_STATE_KEY);
    console.log('User state cleared on logout');
  }

  // Get current user ID
  getCurrentUserId(): string | null {
    const userState = this.getCurrentUserState();
    return userState?.userId || null;
  }

  // Check if user is the same as before
  isSameUser(userId: string): boolean {
    const currentUserId = this.getCurrentUserId();
    return currentUserId === userId;
  }
}

// Export singleton instance
export const userStateManager = UserStateManager.getInstance();

