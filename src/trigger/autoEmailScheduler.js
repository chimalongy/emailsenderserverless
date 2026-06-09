import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { scheduleTaskSending } from "../app/lib/qstash.js";

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
    const timestamp = payload?.timestamp ? new Date(payload.timestamp) : new Date();
    logger.info(`⏰ Starting Auto Email Scheduler at ${timestamp.toISOString()}`);

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

        logger.info(`🚀 Scheduling task sending for task "${task.name}" with ${pendingEmails.length} emails...`);

        // If the scheduled time is in the past, schedule starting from now
        const now = Date.now();
        const baseTime = Math.max(new Date(task.scheduled_at).getTime(), now);
        const sendRate = task.send_rate || 5;

        // Update all pending emails in queue to 'scheduled' status
        for (let i = 0; i < pendingEmails.length; i++) {
          const email = pendingEmails[i];
          const delay = i * sendRate * 1000;
          const emailScheduledTime = baseTime + delay;

          await supabase
            .from("email_queue")
            .update({
              scheduled_at: new Date(emailScheduledTime).toISOString(),
              status: "scheduled"
            })
            .eq("id", email.id);
        }

        try {
          // Schedule the single orchestrator task sending with QStash
          await scheduleTaskSending(task.id, baseTime, task.user_id);
        } catch (schedErr) {
          logger.error(`❌ Failed to schedule task sending for task ${task.id}:`, schedErr);
          
          // Revert status of the emails to failed
          await supabase
            .from("email_queue")
            .update({
              status: "failed",
              error_message: schedErr.message || "Failed to schedule with QStash"
            })
            .eq("task_id", task.id)
            .eq("status", "scheduled");

          await supabase
            .from("tasks")
            .update({ status: "failed" })
            .eq("id", task.id);
        }
      }

      logger.info("🎉 Auto Email Scheduler run completed successfully!");
      return { success: true, message: `Scheduled ${tasksToSchedule.length} tasks.` };

    } catch (err) {
      logger.error("💥 Unexpected error in autoEmailSchedulerTask:", err);
      return { success: false, error: err.message };
    }
  },
});
