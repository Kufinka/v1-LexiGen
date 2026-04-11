import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, username: true, email: true, image: true, bio: true, createdAt: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body too large or malformed. If uploading an image, please use a smaller file." }, { status: 413 });
    }

    const result = profileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { username, bio, image } = result.data;

    // Reject image strings larger than 700KB (base64 data URLs)
    if (image && image.length > 700_000) {
      return NextResponse.json({ error: "Image is too large. Please upload an image under 500 KB." }, { status: 413 });
    }

    const existing = await prisma.user.findFirst({
      where: { username, NOT: { id: session.user.id } },
    });

    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { username, bio: bio || null, image: image || null },
      select: { id: true, username: true, email: true, image: true, bio: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
