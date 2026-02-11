import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isClerkConfigured =
  pk && pk !== "pk_test_xxxxx" && pk.startsWith("pk_") && pk.length > 30;

const clerkHandler = clerkMiddleware();

export default async function proxy(req: Request) {
  if (!isClerkConfigured) {
    return NextResponse.next();
  }
  return clerkHandler(req);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
