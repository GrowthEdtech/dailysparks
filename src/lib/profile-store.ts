import type {
  CreateParentProfileInput,
  ParentProfile,
  UpdateParentNotionInput,
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
  updateParentNotionConnection(
    email: string,
    input: UpdateParentNotionInput,
  ): Promise<ParentProfile | null>;
};
