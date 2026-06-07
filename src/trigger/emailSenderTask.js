import { task, tasks, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// The email-sender orchestrator task: Loops, awaits send-email subtask, and handles rate delays
export const emailSenderTask = task({
  id: "email-sender",
  run: async (payload) => {
    const { taskId } = payload;
    logger.info(`🚀 Starting email-sender orchestrator task for task ID: ${taskId}`);

    try {
      if (!taskId) {
        throw new Error("taskId is required");
      }

      // Fetch task details to get send_rate
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("id, status, send_rate")
        .eq("id", taskId)
        .maybeSingle();

      if (taskError || !taskData) {
        throw new Error(`Failed to retrieve task data: ${taskError?.message || "Task not found"}`);
      }

      // Update task status to in_progress in DB
      if (taskData.status === "scheduled") {
        await supabase
          .from("tasks")
          .update({ status: "in_progress" })
          .eq("id", taskId);
      }

      const sendRate = taskData.send_rate || 5; // default 5 seconds delay

      // Fetch pending emails in the queue
      const { data: pendingEmails, error: queueError } = await supabase
        .from("email_queue")
        .select("id")
        .eq("task_id", taskId)
        .in("status", ["pending", "scheduled"])
        .order("id", { ascending: true });

      if (queueError) {
        throw new Error(`Failed to query email queue: ${queueError.message}`);
      }

      if (!pendingEmails || pendingEmails.length === 0) {
        logger.info(`ℹ️ No pending or scheduled emails to process for task ID: ${taskId}`);
        
        // Mark task completed if queue is empty
        await supabase
          .from("tasks")
          .update({ status: "completed" })
          .eq("id", taskId);
        
        return { success: true, message: "No emails to send" };
      }

      logger.info(`📊 Found ${pendingEmails.length} emails to process for task ID: ${taskId}.`);

      for (let i = 0; i < pendingEmails.length; i++) {
        const email = pendingEmails[i];
        logger.info(`👉 Processing email ${i + 1}/${pendingEmails.length} (Queue ID: ${email.id})`);

        try {
          // Trigger and WAIT for subtask
          await tasks.triggerAndWait("send-email", { emailId: email.id });
        } catch (subtaskErr) {
          logger.error(`⚠️ Subtask send-email failed for email ID ${email.id}: ${subtaskErr.message}`);
          // Continue to next email to prevent blocking the entire queue
        }

        // Delay between emails
        if (i < pendingEmails.length - 1) {
          logger.info(`⏳ Sleeping for ${sendRate} seconds based on task rate limit...`);
          await new Promise((resolve) => setTimeout(resolve, sendRate * 1000));
        }
      }

      logger.info(`🎉 Finished orchestrating task ID: ${taskId}`);
      return { success: true, sent_count: pendingEmails.length };
    } catch (error) {
      logger.error(`💥 Orchestrator task failed for task ID: ${taskId}: ${error.message}`);
      
      // Update task status to failed in DB
      try {
        await supabase
          .from("tasks")
          .update({ status: "failed" })
          .eq("id", taskId);
      } catch (err) {
        logger.error(`Failed to update task state on failure: ${err.message}`);
      }

      throw error;
    }
  },
});
