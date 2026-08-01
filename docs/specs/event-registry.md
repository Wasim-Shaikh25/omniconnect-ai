# Domain Event Registry

Generated at 2026-08-01T13:19:32.413Z.

| Event | Module | Status | Requirement | Subscribers |
|-------|--------|--------|-------------|-------------|
| EscalationRequested | ai | Live | REQ-0004 | modules/notifications/infrastructure/subscribers.ts |
| ReplyGenerated | ai | Planned | REQ-0004 | — |
| AccountAnalyticsSynced | analytics | Planned | REQ-0020 | — |
| CompetitorBenchmarkReady | analytics | Planned | REQ-0020 | — |
| CompetitorChangeDetected | analytics | Planned | REQ-0020 | — |
| CompetitorContentSynced | analytics | Planned | REQ-0020 | — |
| ContentRecommendationCreated | analytics | Planned | REQ-0020 | — |
| MarketingPerformanceUpdated | analytics | Planned | REQ-0020 | — |
| MediaAnalyticsSynced | analytics | Planned | REQ-0020 | — |
| ReportGenerated | analytics | Planned | REQ-0020 | — |
| TrendingHashtagDiscovered | analytics | Planned | REQ-0020 | — |
| UserLoggedIn | auth | Planned | REQ-0001 | — |
| UserRegistered | auth | Live | REQ-0001 | modules/organizations/infrastructure/subscribers.ts |
| BrandDealCreated | branddeals | Live | REQ-0039 | modules/intelligence/infrastructure/subscribers.ts |
| BrandDealInsightGenerated | branddeals | Planned | REQ-0039 | — |
| BrandDealRecommendationGenerated | branddeals | Planned | REQ-0039 | — |
| CatalogSynced | commerce | Planned | REQ-0002 | — |
| ShoppableMediaCreated | commerce | Planned | REQ-0002 | — |
| ContentIdeasGenerated | content | Planned | REQ-0018 | — |
| AIResumed | conversations | Live | REQ-0016 | modules/intelligence/infrastructure/subscribers.ts, modules/notifications/infrastructure/subscribers.ts |
| ConversationInsightGenerated | conversations | Planned | REQ-0016 | — |
| ConversationRecommendationGenerated | conversations | Planned | REQ-0016 | — |
| ConversationTakenOver | conversations | Live | REQ-0016 | modules/intelligence/infrastructure/subscribers.ts, modules/notifications/infrastructure/subscribers.ts |
| NewMessage | conversations | Live | REQ-0016 | modules/ai/infrastructure/subscribers.ts, modules/intelligence/infrastructure/subscribers.ts, modules/notifications/infrastructure/subscribers.ts |
| WelcomeCouponGenerated | coupons | Planned | REQ-0023 | — |
| WelcomeMessageSent | coupons | Planned | REQ-0023 | — |
| CrmInsightGenerated | crm | Planned | REQ-0006 | — |
| CrmRecommendationGenerated | crm | Planned | REQ-0006 | — |
| CustomerProfileUpdated | crm | Live | REQ-0006 | modules/intelligence/infrastructure/subscribers.ts |
| FirstTimeFollowerDetected | crm | Live | REQ-0006 | modules/coupons/infrastructure/subscribers.ts, modules/intelligence/infrastructure/subscribers.ts, modules/notifications/infrastructure/subscribers.ts |
| AbandonedCartDetected | ecommerce | Live | REQ-0002 | modules/notifications/infrastructure/subscribers.ts |
| CommerceInsightGenerated | ecommerce | Planned | REQ-0002 | — |
| CommerceRecommendationGenerated | ecommerce | Planned | REQ-0002 | — |
| CouponDisabled | ecommerce | Live | REQ-0002 | modules/intelligence/infrastructure/subscribers.ts |
| CouponGenerated | ecommerce | Live | REQ-0002 | modules/crm/infrastructure/subscribers.ts, modules/intelligence/infrastructure/subscribers.ts, modules/notifications/infrastructure/subscribers.ts |
| ProductsSynced | ecommerce | Live | REQ-0002 | modules/intelligence/infrastructure/subscribers.ts, modules/organizations/infrastructure/subscribers.ts |
| StoreConnected | ecommerce | Planned | REQ-0002 | — |
| AmbassadorEnrolled | growth | Live | REQ-0013 | modules/intelligence/infrastructure/subscribers.ts |
| BackInStockAlertSent | growth | Planned | REQ-0013 | — |
| BackInStockSubscribed | growth | Planned | REQ-0013 | — |
| CommentUnlockSent | growth | Planned | REQ-0013 | — |
| CommentUnlockTriggered | growth | Planned | REQ-0013 | — |
| DmCampaignCreated | growth | Live | REQ-0013 | modules/intelligence/infrastructure/subscribers.ts |
| DmCampaignSent | growth | Live | REQ-0013 | modules/intelligence/infrastructure/subscribers.ts |
| GrowthInsightGenerated | growth | Planned | REQ-0013 | — |
| GrowthRecommendationGenerated | growth | Planned | REQ-0013 | — |
| ReferralConverted | growth | Live | REQ-0013 | modules/intelligence/infrastructure/subscribers.ts |
| UgcAssetCollected | growth | Live | REQ-0013 | modules/intelligence/infrastructure/subscribers.ts |
| UgcRightsApproved | growth | Planned | REQ-0013 | — |
| UgcRightsRequested | growth | Planned | REQ-0013 | — |
| ActionOutcomeMeasured | intelligence | Planned | REQ-0007 | — |
| ActionPlanApproved | intelligence | Planned | REQ-0007 | — |
| ActionPlanExecuted | intelligence | Planned | REQ-0007 | — |
| BusinessInsightGenerated | intelligence | Live | REQ-0007 | modules/intelligence/infrastructure/subscribers.ts |
| BusinessLearningUpdated | intelligence | Planned | REQ-0007 | — |
| CommentPatternDetected | intelligence | Planned | REQ-0007 | — |
| CompetitorInsightGenerated | intelligence | Live | REQ-0007 | modules/intelligence/infrastructure/subscribers.ts |
| ConfidenceChanged | intelligence | Planned | REQ-0007 | — |
| DailyActionCompleted | intelligence | Planned | REQ-0007 | — |
| DailyActionSkipped | intelligence | Planned | REQ-0007 | — |
| DailyActionsGenerated | intelligence | Planned | REQ-0007 | — |
| DailyMarketingBriefGenerated | intelligence | Planned | REQ-0007 | — |
| DataQualityIssueDetected | intelligence | Planned | REQ-0007 | — |
| DmPatternDetected | intelligence | Planned | REQ-0007 | — |
| EntityLinked | intelligence | Planned | REQ-0007 | — |
| GoalPacingChanged | intelligence | Planned | REQ-0007 | — |
| HypothesisProposed | intelligence | Planned | REQ-0007 | — |
| JourneyUpdated | intelligence | Planned | REQ-0007 | — |
| MarketingMemoryUpdated | intelligence | Planned | REQ-0007 | — |
| OutcomeMeasured | intelligence | Planned | REQ-0007 | — |
| PortfolioSnapshotGenerated | intelligence | Planned | REQ-0007 | — |
| PredictionGenerated | intelligence | Planned | REQ-0007 | — |
| RecommendationAccepted | intelligence | Planned | REQ-0007 | — |
| RecommendationConflictDetected | intelligence | Planned | REQ-0007 | — |
| RecommendationDismissed | intelligence | Planned | REQ-0007 | — |
| RecommendationExpired | intelligence | Planned | REQ-0007 | — |
| RecommendationGenerated | intelligence | Live | REQ-0007 | modules/intelligence/infrastructure/subscribers.ts |
| RecommendationObjectiveTagged | intelligence | Planned | REQ-0007 | — |
| SignalIngested | intelligence | Planned | REQ-0007 | — |
| SystemMetricRecorded | intelligence | Planned | REQ-0007 | — |
| MetaCommentReceived | meta | Live | REQ-0003 | modules/intelligence/infrastructure/subscribers.ts, modules/social/infrastructure/subscribers.ts |
| MetaFollowReceived | meta | Live | REQ-0003 | modules/crm/infrastructure/subscribers.ts, modules/intelligence/infrastructure/subscribers.ts, modules/social/infrastructure/subscribers.ts |
| MetaMessageReceived | meta | Live | REQ-0003 | modules/conversations/infrastructure/subscribers.ts, modules/crm/infrastructure/subscribers.ts, modules/intelligence/infrastructure/subscribers.ts, modules/social/infrastructure/subscribers.ts |
| OrganizationCreated | organizations | Live | REQ-0011 | modules/users/infrastructure/subscribers.ts |
| StoreCreated | organizations | Planned | REQ-0011 | — |
| CommentHidden | social | Planned | REQ-0003 | — |
| CommentReplied | social | Planned | REQ-0003 | — |
| UserProfileUpdated | users | Planned | REQ-0011 | — |
| UserRoleChanged | users | Planned | REQ-0011 | — |

- **Live** events have at least one subscriber.
- **Planned** events are declared but not yet subscribed; each is linked to the requirement that owns the module.
