import type {
  CreateParentProfileInput,
  ParentProfile,
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
};
