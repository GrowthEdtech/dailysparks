import {
  GoogleAuth,
  Impersonated,
  type AuthClient,
} from "google-auth-library";

import type { RuntimeVertexAiConnection } from "./ai-connection-store";

const VERTEX_AI_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

type VertexAiAuthDependencies = {
  buildGoogleAuth?: () => GoogleAuth<AuthClient>;
  buildImpersonatedClient?: (
    sourceClient: AuthClient,
    targetPrincipal: string,
  ) => AuthClient;
};

function defaultBuildGoogleAuth() {
  return new GoogleAuth({
    scopes: [VERTEX_AI_SCOPE],
  });
}

function defaultBuildImpersonatedClient(
  sourceClient: AuthClient,
  targetPrincipal: string,
) {
  return new Impersonated({
    sourceClient,
    targetPrincipal,
    targetScopes: [VERTEX_AI_SCOPE],
    lifetime: 3000,
  });
}

function extractAccessToken(
  value: string | null | undefined | { token?: string | null },
) {
  if (typeof value === "string") {
    return value.trim();
  }

  return value?.token?.trim() ?? "";
}

export async function getVertexAccessToken(
  connection: RuntimeVertexAiConnection,
  dependencies: VertexAiAuthDependencies = {},
) {
  const googleAuth =
    dependencies.buildGoogleAuth?.() ?? defaultBuildGoogleAuth();
  const sourceClient = await googleAuth.getClient();
  const authClient = connection.serviceAccountEmail
    ? (dependencies.buildImpersonatedClient ?? defaultBuildImpersonatedClient)(
        sourceClient,
        connection.serviceAccountEmail,
      )
    : sourceClient;
  const token = extractAccessToken(await authClient.getAccessToken());

  if (!token) {
    throw new Error("Vertex AI auth did not return an access token.");
  }

  return token;
}
