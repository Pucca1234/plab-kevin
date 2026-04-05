import { createClient as createRouteClient } from "./server";
import { supabaseServer } from "../supabaseServer";

type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

const readBearerToken = (request: Request) => {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token.length > 0 ? token : null;
};

export async function getRequestUser(request: Request): Promise<AuthenticatedUser | null> {
  try {
    const routeClient = await createRouteClient();
    const {
      data: { user }
    } = await routeClient.auth.getUser();
    if (user) {
      return { id: user.id, email: user.email ?? null };
    }
  } catch {
    // Fall through to bearer-token auth.
  }

  const accessToken = readBearerToken(request);
  if (!accessToken) return null;

  try {
    const {
      data: { user }
    } = await supabaseServer.auth.getUser(accessToken);
    if (!user) return null;
    return { id: user.id, email: user.email ?? null };
  } catch {
    return null;
  }
}
