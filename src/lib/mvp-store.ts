import type {
  CreateParentProfileInput,
  UpdateParentNotionInput,
  UpdateParentSubscriptionInput,
  UpdateStudentPreferencesInput,
} from "./mvp-types";
import { firestoreProfileStore } from "./firestore-profile-store";
import { localProfileStore } from "./local-profile-store";
import {
  getProfileStoreBackend,
  validateProfileStoreConfig,
} from "./profile-store-config";

function getProfileStore() {
  validateProfileStoreConfig();

  return getProfileStoreBackend() === "firestore"
    ? firestoreProfileStore
    : localProfileStore;
}

export async function getProfileByEmail(email: string) {
  return getProfileStore().getProfileByEmail(email);
}

export async function getOrCreateParentProfile(
  input: CreateParentProfileInput,
) {
  return getProfileStore().getOrCreateParentProfile(input);
}

export async function updateStudentPreferences(
  email: string,
  input: UpdateStudentPreferencesInput,
) {
  return getProfileStore().updateStudentPreferences(email, input);
}

export async function updateParentSubscription(
  email: string,
  input: UpdateParentSubscriptionInput,
) {
  return getProfileStore().updateParentSubscription(email, input);
}

export async function updateParentNotionConnection(
  email: string,
  input: UpdateParentNotionInput,
) {
  return getProfileStore().updateParentNotionConnection(email, input);
}
