import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { scheduleEmail } from "../app/lib/qstash.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const autoEmailSchedulerTask = schedules.task({
  id: "auto-email-scheduler",
  cron: {
    pattern: "0 2 * * *", // 2am UTC every day
    timezone: "UTC",
  },
  run: async (payload) => {
    logger.info(`⏰ Starting Auto Email Scheduler at ${payload.timestamp.toISOString()}`);

    try {
      // Find all tasks that are scheduled and scheduled_at <= end of today
      const endOfToday = new Date();
      endOfToday.setUTCHours(23, 59, 59, 999);

      logger.info(`🔍 Fetching tasks scheduled on or before ${endOfToday.toISOString()}`);

      const { data: tasksToSchedule, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "scheduled")
        .lte("scheduled_at", endOfToday.toISOString());

      if (tasksError) {
        logger.error("💥 Error fetching tasks to schedule:", tasksError);
        return { success: false, error: "Failed to fetch tasks" };
      }

      if (!tasksToSchedule || tasksToSchedule.length === 0) {
        logger.info("ℹ️ No tasks found scheduled for today.");
        return { success: true, message: "No tasks to schedule today." };
      }

      logger.info(`📅 Found ${tasksToSchedule.length} task(s) to schedule.`);

      for (const task of tasksToSchedule) {
        logger.info(`Processing task: "${task.name}" (ID: ${task.id}) scheduled at ${task.scheduled_at}`);

        // Fetch pending emails in the queue for this task
        const { data: pendingEmails, error: pendingFetchError } = await supabase
          .from("email_queue")
          .select("id, status, recipient")
          .eq("task_id", task.id)
          .eq("status", "pending");

        if (pendingFetchError) {
          logger.error(`💥 Error fetching pending emails for task ${task.id}:`, pendingFetchError);
          continue;
        }

        if (!pendingEmails || pendingEmails.length === 0) {
          logger.info(`ℹ️ No pending emails found for task ${task.id}.`);
          continue;
        }

        logger.info(`🚀 Scheduling ${pendingEmails.length} emails for task "${task.name}"...`);

        // If the scheduled time is in the past, schedule starting from now
        const now = Date.now();
        const baseTime = Math.max(new Date(task.scheduled_at).getTime(), now);
        const sendRate = task.send_rate || 5;

        for (let i = 0; i < pendingEmails.length; i++) {
          const email = pendingEmails[i];
          const delay = i * sendRate * 1000;
          const scheduledTime = baseTime + delay;

          try {
            // Schedule with QStash
            await scheduleEmail(email.id, task.id, scheduledTime, task.user_id);

            // Update queue entry status to scheduled
            await supabase
              .from("email_queue")
              .update({
                scheduled_at: new Date(scheduledTime).toISOString(),
                status: "scheduled"
              })
              .eq("id", email.id);
          } catch (schedErr) {
            logger.error(`❌ Failed to schedule email ${email.id} for task ${task.id}:`, schedErr);
            await supabase
              .from("email_queue")
              .update({
                status: "failed",
                error_message: schedErr.message || "Failed to schedule with QStash"
              })
              .eq("id", email.id);
          }
        }
      }

      logger.info("🎉 Auto Email Scheduler run completed successfully!");
      return { success: true, message: `Scheduled emails for ${tasksToSchedule.length} tasks.` };

    } catch (err) {
      logger.error("💥 Unexpected error in autoEmailSchedulerTask:", err);
      return { success: false, error: err.message };
    }
  },
});
