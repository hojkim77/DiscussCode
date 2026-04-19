import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { cache } from "../services/cache.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string | null;
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("userId", null);

  // onRequest so rate-limit (registered after) can see req.userId
  app.addHook("onRequest", async (req: FastifyRequest) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return;

    const token = authHeader.slice(7);
    const cacheKey = `jwt:${token.slice(-16)}`; // avoid storing full token as key

    const cachedId = await cache.get(cacheKey);
    if (cachedId) {
      req.userId = cachedId;
      return;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) {
      req.userId = data.user.id;
      // Cache validated token for 5 min (shorter than Supabase's 1h access token)
      await cache.setex(cacheKey, 300, data.user.id);
    }
  });
};

export { authPlugin };
export default fp(authPlugin, { name: "auth" });
