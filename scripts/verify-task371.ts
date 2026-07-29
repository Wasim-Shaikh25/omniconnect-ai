import { prisma } from "@/shared/database";
import { updateMarketingMemory, generateDailyBrief } from "@/modules/intelligence";
import { askBusinessBrain, generatePostIdeas } from "@/modules/ai/server";
import { getMarketingPerformance } from "@/modules/analytics/server";
import { getCompetitorBenchmark } from "@/modules/analytics/server";

async function main() {
  const timestamp = Date.now();
  const org = await prisma.organization.create({
    data: { name: `Task 371 Validation ${timestamp}` },
  });
  const store = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "Validation Store",
      provider: "CUSTOM",
      domain: `validation-${timestamp}.myshopify.com`,
    },
  });

  await prisma.product.create({
    data: {
      externalId: `prod-${timestamp}`,
      title: "Validation Tee",
      description: "A great tee",
      price: 2500,
      currency: "USD",
      inventory: 5,
      storeId: store.id,
    },
  });

  const customer = await prisma.customer.create({
    data: { storeId: store.id, username: "validation_customer" },
  });

  const conversation = await prisma.conversation.create({
    data: { storeId: store.id, channel: "INSTAGRAM", customerId: customer.id },
  });

  await prisma.message.createMany({
    data: [
      { conversationId: conversation.id, sender: "CUSTOMER", content: "Is the Validation Tee available in blue?" },
      { conversationId: conversation.id, sender: "CUSTOMER", content: "What is the price?" },
    ],
  });

  await prisma.socialComment.create({
    data: {
      storeId: store.id,
      text: "This looks amazing! Love the color.",
      intent: "COMPLIMENT",
      sentiment: "POSITIVE",
    },
  });

  await prisma.socialMention.create({
    data: {
      storeId: store.id,
      source: "HASHTAG",
      caption: "Great style #fashion #ootd",
      hashtags: ["fashion", "ootd"],
    },
  });

  const tracked = await prisma.trackedAccount.create({
    data: {
      storeId: store.id,
      platform: "INSTAGRAM",
      handle: "rival-brand",
      lastMedia: [
        {
          id: "m1",
          externalId: "ext-1",
          platform: "INSTAGRAM",
          mediaType: "REEL",
          caption: "New drop! Shop now.",
          permalink: null,
          mediaUrl: null,
          thumbnailUrl: null,
          ownerUsername: "rival-brand",
          publishedAt: new Date(),
          hashtags: ["fashion", "newdrop"],
          metrics: { likes: 120, comments: 15, plays: 400 },
        },
        {
          id: "m2",
          externalId: "ext-2",
          platform: "INSTAGRAM",
          mediaType: "IMAGE",
          caption: "Behind the scenes of our latest collection shoot.",
          permalink: null,
          mediaUrl: null,
          thumbnailUrl: null,
          ownerUsername: "rival-brand",
          publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          hashtags: ["behindthescenes"],
          metrics: { likes: 80, comments: 5 },
        },
      ],
    },
  });

  const memory = await updateMarketingMemory(org.id, store.id);
  if (!memory || memory.storeId !== store.id) {
    throw new Error("Marketing memory not generated for store");
  }
  if (memory.productScores.length === 0) {
    throw new Error("Expected product scores in marketing memory");
  }
  if (memory.dmPatterns.length === 0) {
    throw new Error("Expected DM patterns in marketing memory");
  }
  if (memory.commentPatterns.length === 0) {
    throw new Error("Expected comment patterns in marketing memory");
  }
  if (memory.trendingHashtags.length === 0) {
    throw new Error("Expected trending hashtags in marketing memory");
  }

  const brief = await generateDailyBrief(org.id, store.id, memory);
  if (!brief.contentIdea) throw new Error("Expected daily brief content idea");
  if (brief.sections.length === 0) throw new Error("Expected daily brief sections");
  if (brief.priorities.length === 0) throw new Error("Expected daily brief priorities");

  const brainAnswer = await askBusinessBrain({
    organizationId: org.id,
    storeId: store.id,
    userId: "verify-user",
    question: "What should I post today?",
  });
  if (!brainAnswer.answer || brainAnswer.answer.length === 0) {
    throw new Error("Expected Marketing Brain answer text");
  }

  const postIdeas = await generatePostIdeas({
    storeId: store.id,
    organizationId: org.id,
    caption: "Reel ideas",
    hashtags: [],
    mediaType: "REEL",
    metrics: {},
    count: 3,
  });
  if (!postIdeas.ideas || postIdeas.ideas.length === 0) {
    throw new Error("Expected content ideas");
  }
  if (!postIdeas.evidence || postIdeas.evidence.length === 0) {
    throw new Error("Expected content ideas evidence");
  }

  const marketingPerformance = await getMarketingPerformance({ organizationId: org.id, storeId: store.id });
  if (marketingPerformance.storeId !== store.id) throw new Error("Marketing performance not for store");
  if (marketingPerformance.audience.conversations !== 1) {
    throw new Error("Expected 1 conversation in marketing analytics");
  }
  if (marketingPerformance.audience.messages !== 2) {
    throw new Error("Expected 2 messages in marketing analytics");
  }

  const benchmark = await getCompetitorBenchmark({ organizationId: org.id, storeId: store.id, accountId: tracked.id });
  if (!benchmark) throw new Error("Competitor benchmark not generated");
  if (benchmark.postCount !== 2) throw new Error("Expected 2 competitor posts");
  if (benchmark.reelCount !== 1) throw new Error("Expected 1 Reel in competitor benchmark");
  if (benchmark.suggestions.length === 0) throw new Error("Expected competitor benchmark suggestions");

  console.log("TASK-371 validation passed");
  console.log(
    JSON.stringify(
      {
        organizationId: org.id,
        storeId: store.id,
        productScoresCount: memory.productScores.length,
        dmPatterns: memory.dmPatterns,
        commentPatterns: memory.commentPatterns,
        trendingHashtags: memory.trendingHashtags,
        brief: {
          contentIdea: brief.contentIdea,
          priorities: brief.priorities,
        },
        brainAnswer: brainAnswer.answer.slice(0, 100),
        postIdeasCount: postIdeas.ideas.length,
        postIdeasEvidence: postIdeas.evidence,
        marketingPerformance: marketingPerformance.summary,
        competitorBenchmark: benchmark,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
