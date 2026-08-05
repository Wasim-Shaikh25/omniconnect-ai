import { eventBus } from "@/shared/events";
import type { EntityLinkRepository } from "./ports";
import { EntityLinked } from "../domain/events";
import type { ConfidenceLevel, EntityLinkRecord, LinkStatus } from "../domain/types";

export interface ResolveEntityInput {
  userId: string;
  projectId?: string | null;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  linkType: string;
  confidence: ConfidenceLevel;
  resolutionMethod: string;
}

export function makeEntityResolutionService(links: EntityLinkRepository) {
  return {
    async resolve(input: ResolveEntityInput): Promise<EntityLinkRecord> {
      const existing = await links.findBetween(
        input.userId,
        input.sourceType,
        input.sourceId,
        input.targetType,
        input.targetId,
      );

      if (existing && existing.status !== "REVOKED") {
        if (existing.confidence === input.confidence) return existing;
        return links.updateConfidence(existing.id, input.userId, input.confidence, input.resolutionMethod);
      }

      const link = await links.save({
        userId: input.userId,
        projectId: input.projectId ?? null,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        targetType: input.targetType,
        targetId: input.targetId,
        linkType: input.linkType,
        confidence: input.confidence,
        resolutionMethod: input.resolutionMethod,
        status: "ACTIVE",
      });

      await eventBus.publish(
        new EntityLinked(link.id, {
          linkId: link.id,
          sourceType: link.sourceType,
          sourceId: link.sourceId,
          targetType: link.targetType,
          targetId: link.targetId,
          confidence: link.confidence,
        }),
      );

      return link;
    },

    async merge(linkId: string, userId: string): Promise<EntityLinkRecord> {
      return links.updateConfidence(linkId, userId, "VERIFIED", "manual");
    },

    async split(linkId: string, userId: string): Promise<EntityLinkRecord> {
      return links.updateStatus(linkId, userId, "REVOKED");
    },

    async getLinkedEntities(
      userId: string,
      entityType: string,
      entityId: string,
    ): Promise<EntityLinkRecord[]> {
      return links.findByEntity(userId, entityType, entityId, true);
    },

    async getLinkById(id: string, userId?: string): Promise<EntityLinkRecord | null> {
      return links.findById(id, userId);
    },
  };
}

export type EntityResolutionService = ReturnType<typeof makeEntityResolutionService>;

export type { ConfidenceLevel, LinkStatus };
