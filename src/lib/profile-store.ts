import type {
  CreateParentProfileInput,
  ParentProfile,
  UpdateParentAcquisitionSnapshotInput,
  UpdateParentGrowthMilestonesInput,
  UpdateParentDeliveryPreferencesInput,
  UpdateParentNotificationEmailStateInput,
  UpdateParentOnboardingReminderInput,
  UpdateParentNotionInput,
  UpdateParentSubscriptionInput,
  UpdateStudentGoodnotesInput,
  UpdateStudentPreferencesInput,
} from "./mvp-types";

export type ProfileStore = {
  getProfileByEmail(email: string): Promise<ParentProfile | null>;
  getProfileByParentId(parentId: string): Promise<ParentProfile | null>;
  listParentProfiles(): Promise<ParentProfile[]>;
  listEligibleDeliveryProfiles(): Promise<ParentProfile[]>;
  listDispatchableDeliveryProfiles(): Promise<ParentProfile[]>;
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
  updateParentDeliveryPreferences(
    email: string,
    input: UpdateParentDeliveryPreferencesInput,
  ): Promise<ParentProfile | null>;
  updateParentOnboardingReminder(
    email: string,
    input: UpdateParentOnboardingReminderInput,
  ): Promise<ParentProfile | null>;
  updateParentGrowthMilestones(
    email: string,
    input: UpdateParentGrowthMilestonesInput,
  ): Promise<ParentProfile | null>;
  updateParentAcquisitionSnapshot(
    email: string,
    input: UpdateParentAcquisitionSnapshotInput,
  ): Promise<ParentProfile | null>;
  updateParentNotificationEmailState(
    email: string,
    input: UpdateParentNotificationEmailStateInput,
  ): Promise<ParentProfile | null>;
};
