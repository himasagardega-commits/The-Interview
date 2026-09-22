import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { isApproved } = await req.json();

    const updatedUser = await prisma.user.update({
      where: { id, role: "MANAGER" },
      data: { isApproved },
      select: {
        id: true,
        name: true,
        email: true,
        isApproved: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error updating manager status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.user.delete({
      where: { id, role: "MANAGER" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting manager:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
