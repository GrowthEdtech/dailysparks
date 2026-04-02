import type {
  CreateParentProfileInput,
  ParentProfile,
  UpdateParentNotionInput,
  UpdateParentSubscriptionInput,
  UpdateStudentGoodnotesInput,
  UpdateStudentPreferencesInput,
} from "./mvp-types";

export type ProfileStore = {
  getProfileByEmail(email: string): Promise<ParentProfile | null>;
  listEligibleDeliveryProfiles(): Promise<ParentProfile[]>;
  getOrCreateParentProfile(
    input: CreateParentProfileInput,
  ): Promise<ParentProfile>;
  updateStudentPreferences(
    email: string,
    input: UpdateStudentPreferencesInput,
  ): Promise<ParentProfile | null>;
  updateStudentGoodnotesDelivery(
    email: string,
    input: UpdateStudentGoodnotesInput,
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
