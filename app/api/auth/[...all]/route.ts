import { auth } from "@/auth/better-auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

export const { GET, POST, PUT, PATCH, DELETE } = handler;
