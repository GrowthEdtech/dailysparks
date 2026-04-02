import {
  createPromptPolicy,
  listPromptPolicies,
  updatePromptPolicy,
} from "../../../../lib/prompt-policy-store";
import {
  clearEditorialAdminSessionCookieHeader,
  getEditorialAdminSessionFromRequest,
} from "../../../../lib/editorial-admin-auth";

type PromptPolicyRequestBody = {
  id?: unknown;
  name?: unknown;
  versionLabel?: unknown;
  sharedInstructions?: unknown;
  antiRepetitionInstructions?: unknown;
  outputContractInstructions?: unknown;
  pypInstructions?: unknown;
  mypInstructions?: unknown;
  dpInstructions?: unknown;
  notes?: unknown;
};

function unauthorized(message: string) {
  return Response.json(
    { message },
    {
      status: 401,
      headers: {
        "Set-Cookie": clearEditorialAdminSessionCookieHeader(),
      },
    },
  );
}

function badRequest(message: string) {
  return Response.json({ message }, { status: 400 });
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdminSession(request: Request) {
  const session = await getEditorialAdminSessionFromRequest(request);

  if (!session) {
    return {
      errorResponse: unauthorized("Please log in to the editorial admin."),
      session: null,
    };
  }

  return {
    errorResponse: null,
    session,
  };
}

function buildCreateInput(body: PromptPolicyRequestBody | null) {
  const name = normalizeString(body?.name);
  const versionLabel = normalizeString(body?.versionLabel);
  const sharedInstructions = normalizeString(body?.sharedInstructions);
  const antiRepetitionInstructions = normalizeString(
    body?.antiRepetitionInstructions,
  );
  const outputContractInstructions = normalizeString(
    body?.outputContractInstructions,
  );
  const pypInstructions = normalizeString(body?.pypInstructions);
  const mypInstructions = normalizeString(body?.mypInstructions);
  const dpInstructions = normalizeString(body?.dpInstructions);
  const notes = normalizeString(body?.notes);

  if (
    !name ||
    !versionLabel ||
    !sharedInstructions ||
    !antiRepetitionInstructions ||
    !outputContractInstructions ||
    !pypInstructions ||
    !mypInstructions ||
    !dpInstructions
  ) {
    return null;
  }

  return {
    name,
    versionLabel,
    sharedInstructions,
    antiRepetitionInstructions,
    outputContractInstructions,
    pypInstructions,
    mypInstructions,
    dpInstructions,
    notes,
  };
}

export async function GET(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const policies = await listPromptPolicies();

  return Response.json({ policies });
}

export async function POST(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | PromptPolicyRequestBody
    | null;
  const input = buildCreateInput(body);

  if (!input) {
    return badRequest("Please submit a valid prompt policy.");
  }

  const policy = await createPromptPolicy(input);

  return Response.json({ policy });
}

export async function PUT(request: Request) {
  const adminCheck = await requireAdminSession(request);

  if (adminCheck.errorResponse) {
    return adminCheck.errorResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | PromptPolicyRequestBody
    | null;
  const id = normalizeString(body?.id);

  if (!id) {
    return badRequest("Please choose a prompt policy to update.");
  }

  const policy = await updatePromptPolicy(id, {
    ...(body?.name !== undefined ? { name: normalizeString(body.name) } : {}),
    ...(body?.versionLabel !== undefined
      ? { versionLabel: normalizeString(body.versionLabel) }
      : {}),
    ...(body?.sharedInstructions !== undefined
      ? { sharedInstructions: normalizeString(body.sharedInstructions) }
      : {}),
    ...(body?.antiRepetitionInstructions !== undefined
      ? {
          antiRepetitionInstructions: normalizeString(
            body.antiRepetitionInstructions,
          ),
        }
      : {}),
    ...(body?.outputContractInstructions !== undefined
      ? {
          outputContractInstructions: normalizeString(
            body.outputContractInstructions,
          ),
        }
      : {}),
    ...(body?.pypInstructions !== undefined
      ? { pypInstructions: normalizeString(body.pypInstructions) }
      : {}),
    ...(body?.mypInstructions !== undefined
      ? { mypInstructions: normalizeString(body.mypInstructions) }
      : {}),
    ...(body?.dpInstructions !== undefined
      ? { dpInstructions: normalizeString(body.dpInstructions) }
      : {}),
    ...(body?.notes !== undefined ? { notes: normalizeString(body.notes) } : {}),
  });

  if (!policy) {
    return Response.json(
      {
        message:
          "We could not update that prompt policy. Only draft policies can be edited.",
      },
      { status: 404 },
    );
  }

  return Response.json({ policy });
}
