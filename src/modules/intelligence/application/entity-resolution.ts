import { eventBus } from "@/shared/events";
import type { EntityLinkRepository } from "./ports";
import { EntityLinked } from "../domain/events";
import type { ConfidenceLevel, EntityLinkRecord, LinkStatus } from "../domain/types";

export interface ResolveEntityInput {
  organizationId: string;
  storeId?: string | null;
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
        input.organizationId,
        input.sourceType,
        input.sourceId,
        input.targetType,
        input.targetId,
      );

      if (existing && existing.status !== "REVOKED") {
        if (existing.confidence === input.confidence) return existing;
        return links.updateConfidence(existing.id, input.organizationId, input.confidence, input.resolutionMethod);
      }

      const link = await links.save({
        organizationId: input.organizationId,
        storeId: input.storeId ?? null,
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

    async merge(linkId: string, organizationId: string): Promise<EntityLinkRecord> {
      return links.updateConfidence(linkId, organizationId, "VERIFIED", "manual");
    },

    async split(linkId: string, organizationId: string): Promise<EntityLinkRecord> {
      return links.updateStatus(linkId, organizationId, "REVOKED");
    },

    async getLinkedEntities(
      organizationId: string,
      entityType: string,
      entityId: string,
    ): Promise<EntityLinkRecord[]> {
      return links.findByEntity(organizationId, entityType, entityId, true);
    },

    async getLinkById(id: string, organizationId?: string): Promise<EntityLinkRecord | null> {
      return links.findById(id, organizationId);
    },
  };
}

export type EntityResolutionService = ReturnType<typeof makeEntityResolutionService>;

export type { ConfidenceLevel, LinkStatus };
