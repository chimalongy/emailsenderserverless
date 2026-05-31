import { task, logger } from "@trigger.dev/sdk/v3";

export const autoOutboundPlannerTask = task({
  id: "auto-outbound-planner",
  run: async (payload) => {
    logger.info("Planning auto Oubound");

    return {
      success: true,
      message: "Planner task executed",
    };
  },
});
