import type { Prisma } from "@prisma/client";

export async function writeAdminAudit(
  tx: Prisma.TransactionClient,
  actorUserId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Prisma.InputJsonValue,
) {
  await tx.adminAuditLog.create({
    data: { actorUserId, action, entityType, entityId: entityId ?? null, metadata },
  });
}
