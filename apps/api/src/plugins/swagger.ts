import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

const swaggerPlugin: FastifyPluginAsync = async (app) => {
  await app.register(import("@fastify/swagger"), {
    openapi: {
      info: { title: "DiscussCode API", version: "0.1.0" },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
  });

  if (process.env.NODE_ENV !== "production") {
    await app.register(import("@fastify/swagger-ui"), {
      routePrefix: "/docs",
    });
  }
};

export { swaggerPlugin };
export default fp(swaggerPlugin, { name: "swagger" });
