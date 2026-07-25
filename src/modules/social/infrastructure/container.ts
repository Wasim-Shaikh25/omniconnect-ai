import {
  PrismaSocialCommentRepository,
  PrismaSocialMentionRepository,
} from "./repositories";
import { PrismaLeadRepository } from "./lead.repositories";
import { makeSocialAutomationService } from "../application/service";
import { makeSocialQueries } from "../application/queries";
import { makeLeadService } from "../application/lead.service";

const comments = new PrismaSocialCommentRepository();
const mentions = new PrismaSocialMentionRepository();
const leads = new PrismaLeadRepository();

export const socialAutomationService = makeSocialAutomationService({
  comments,
  mentions,
});

export const socialQueries = makeSocialQueries({ comments, mentions });
export const leadService = makeLeadService({ leads });
