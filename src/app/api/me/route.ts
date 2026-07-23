import { NextResponse } from "next/server";
import {
  getCurrentOrganization,
  requireUser,
} from "@/lib/auth/current-context";

export async function GET() {
  const user = await requireUser();
  const organization = await getCurrentOrganization();

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    organization,
  });
}
