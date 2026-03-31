import type {
  CreateParentProfileInput,
  ParentProfile,
  UpdateParentSubscriptionInput,
  UpdateStudentPreferencesInput,
} from "./mvp-types";

export type ProfileStore = {
  getProfileByEmail(email: string): Promise<ParentProfile | null>;
  getOrCreateParentProfile(
    input: CreateParentProfileInput,
  ): Promise<ParentProfile>;
  updateStudentPreferences(
    email: string,
    input: UpdateStudentPreferencesInput,
  ): Promise<ParentProfile | null>;
  updateParentSubscription(
    email: string,
    input: UpdateParentSubscriptionInput,
  ): Promise<ParentProfile | null>;
};
