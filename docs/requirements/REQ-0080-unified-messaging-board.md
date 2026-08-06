---
description: Unified Messaging Board
---

# REQ-0080: Unified Messaging Board

- **Status:** Approved
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0080-unified-messaging-board.md`
- **Related Tracker:** `docs/trackers/TRACKER-0080-unified-messaging-board.md`
- **Supersedes:** `REQ-0016-unified-inbox.md`, `REQ-0008-human-takeover.md`
- **Last updated:** 2026-08-06

## 1. Summary

One inbox for Instagram DM, Facebook Messenger, and WhatsApp. The existing `conversations` module already owns unified storage, an inbox UI, human takeover, and IG/FB webhook ingestion. This batch finishes channel-specific outbound sending (manual and AI replies) and AI auto-reply gating by channel enable/disable and business hours. WhatsApp webhook/sender is deferred until Meta Business verification details are available.

## 2. Goals

- Unified webhook handler: single endpoint routing IG DM, FB Messenger, WhatsApp messages.
- MessageSender: channel-specific sending (IG DM, FB Messenger, WhatsApp Business API).
- Conversation + Message models for unified storage.
- Unified inbox UI: conversation list, channel badges, filter, customer profile merge.
- AI auto-reply per channel with business hours and tone settings.
- Human takeover toggle per conversation.

## 3. Non-Goals

- SMS messaging.
- Email as a messaging channel.
- Group chat handling.

## 4. User Stories

- As a user, I want all customer conversations from IG, FB, and WhatsApp in one inbox.
- As a user, I want the AI to reply on the same channel the customer used.
- As a user, I want to take over a conversation from the AI at any time.
- As a user, I want different AI tones per channel (casual for IG, professional for WhatsApp).

## 5. Acceptance Criteria

- [x] Single webhook endpoint handles IG and FB Messenger events; WhatsApp route scaffolded.
- [x] Webhook signature verification (HMAC-SHA256) for IG/FB.
- [x] Messages stored with channel, direction, senderType.
- [x] AI auto-reply respects channel enable/disable and business hours from AIConfiguration.
- [x] MessageSender routes to correct Meta API per channel for IG/FB.
- [x] Human takeover flag stops AI replies on that conversation.
- [x] Unified inbox UI with channel badges and filter.
- [x] Manual human reply form from the conversation detail page.
- [ ] WhatsApp Business API webhook + sender (deferred).
- [ ] Mobile PWA optimization for messaging UI (P2).

## 6. Scope & Dependencies

- Modules: `messaging` (new), `ai`
- Depends on: REQ-0077 (Project), REQ-0082 (AI config for channel settings)
- External: Instagram Messaging API, Facebook Messenger Platform, WhatsApp Business API

## 7. Code Snippets

### Unified Webhook Handler

```ts
// src/modules/messaging/infrastructure/webhook-router.ts

async function handleMetaWebhook(req: NextRequest) {
  const body = await req.json();
  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(body, signature, env.META_APP_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  for (const entry of body.entry) {
    if (entry.messaging) {
      for (const event of entry.messaging) {
        const channel = detectChannel(entry, event);
        await messageQueue.add("process-message", {
          channel,
          senderId: event.sender.id,
          recipientId: event.recipient.id,
          message: event.message,
          timestamp: event.timestamp,
        });
      }
    }
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === "messages") {
          for (const msg of change.value.messages ?? []) {
            await messageQueue.add("process-message", {
              channel: "WHATSAPP",
              senderId: msg.from,
              recipientId: change.value.metadata.phone_number_id,
              message: { text: msg.text?.body, type: msg.type },
              timestamp: msg.timestamp,
            });
          }
        }
      }
    }
  }
  return NextResponse.json({ status: "ok" });
}
```

### Channel-Specific Sending

```ts
// src/modules/messaging/infrastructure/message-sender.ts

class MessageSender {
  async send(input: SendInput): Promise<void> {
    switch (input.channel) {
      case "INSTAGRAM_DM":
        await this.sendInstagramDM(input);
        break;
      case "FACEBOOK_MESSENGER":
        await this.sendFacebookMessage(input);
        break;
      case "WHATSAPP":
        await this.sendWhatsAppMessage(input);
        break;
    }
  }

  private async sendWhatsAppMessage(input: SendInput) {
    await fetch(`https://graph.facebook.com/v21.0/${input.whatsappPhoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.projectAccessToken}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.recipientId,
        type: "text",
        text: { body: input.message },
      }),
    });
  }
}
```

## 8. Open Questions

- WhatsApp Business API requires Meta Business verification — document onboarding flow.
