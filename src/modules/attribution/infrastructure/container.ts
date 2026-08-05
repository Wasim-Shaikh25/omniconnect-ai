import type { ConnectorOrder } from "@/modules/ecommerce";
import { metaService } from "@/modules/meta/server";
import { PrismaAttributionLinkRepository } from "./attribution-link.repository";
import { couponLookup } from "./coupon-lookup.adapter";
import { projectConfig } from "./project-config.adapter";
import { makeCreateAttributionLink } from "../application/create-link";
import { makeRecordConversion } from "../application/record-conversion";
import { makeListAttributionLinks } from "../application/list-links";

const links = new PrismaAttributionLinkRepository();

const conversionEventSink = {
  async sendPurchaseEvent(projectId: string, order: ConnectorOrder) {
    await metaService.sendPurchaseEvent(projectId, order);
  },
};

export const createAttributionLink = makeCreateAttributionLink(links, couponLookup, projectConfig);
export const recordConversion = makeRecordConversion(links, couponLookup, conversionEventSink);
export const listAttributionLinks = makeListAttributionLinks(links);
export const countAttributionLinksThisMonth = (projectId: string, now?: Date) =>
  links.countByProjectThisMonth(projectId, now);
