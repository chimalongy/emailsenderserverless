import { task, tasks, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { resetDailyCountsIfNeeded } from "../app/lib/resetDailyCounts.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to update task status
async function updateTaskStatus(taskId) {
  if (!taskId) return;

  try {
    const { data: currentTask, error: taskError } = await supabase
      .from("tasks")
      .select("status")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError || !currentTask) {
      logger.error(`Error fetching task for status update: ${taskError?.message || "Task not found"}`);
      return;
    }

    if (currentTask.status === "scheduled") {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "in_progress" })
        .eq("id", taskId);
      
      if (updateError) {
        logger.error(`Error updating task status to in_progress: ${updateError.message}`);
      } else {
        logger.info(`Task ${taskId} status updated to in_progress`);
      }
    }

    const { data: remainingEmails, error: remainingError } = await supabase
      .from("email_queue")
      .select("id")
      .eq("task_id", taskId)
      .in("status", ["scheduled", "pending"])
      .limit(1);

    if (remainingError) {
      logger.error(`Error checking remaining emails: ${remainingError.message}`);
      return;
    }

    if (!remainingEmails || remainingEmails.length === 0) {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", taskId);

      if (updateError) {
        logger.error(`Error updating task status to completed: ${updateError.message}`);
      } else {
        logger.info(`Task ${taskId} status updated to completed`);
      }
    }
  } catch (err) {
    logger.error(`Error in updateTaskStatus: ${err.message}`);
  }
}

// 1. The send-email task: Sends a single email and updates the DB and parent task
export const sendEmailTask = task({
  id: "send-email",
  run: async (payload) => {
    const { emailId } = payload;
    logger.info(`📧 Running send-email task for email queue ID: ${emailId}`);

    try {
      if (!emailId) {
        throw new Error("emailId is required");
      }

      // Get email details with account info
      const { data: email, error: emailError } = await supabase
        .from("email_queue")
        .select(`
          *,
          email_accounts (*)
        `)
        .eq("id", emailId)
        .maybeSingle();

      if (emailError) {
        throw new Error(`Database error fetching email: ${emailError.message}`);
      }

      if (!email) {
        logger.warn(`Skipping: Email ID ${emailId} not found in queue.`);
        return { success: true, message: "Email not found" };
      }

      if (email.status === "sent") {
        logger.info(`Email ID ${emailId} already marked as sent.`);
        return { success: true, message: "Already sent" };
      }

      if (email.status !== "scheduled" && email.status !== "pending") {
        logger.info(`Skipping: Email status is ${email.status}`);
        return { success: true, message: `Skipped with status: ${email.status}` };
      }

      const account = email.email_accounts;
      if (!account || !account.active) {
        throw new Error("Email account not available or inactive");
      }

      // Reset daily count if we've entered a new day
      await resetDailyCountsIfNeeded(account.id);

      // Fetch account details again to verify limit
      const { data: updatedAccount } = await supabase
        .from("email_accounts")
        .select("sent_today, daily_limit")
        .eq("id", account.id)
        .maybeSingle();

      const currentAccount = updatedAccount || account;
      if ((currentAccount.sent_today || 0) >= (currentAccount.daily_limit || 0)) {
        throw new Error(`Daily sending limit reached for account: ${account.email}`);
      }

      // Handle follow-up reply threading message-id lookup
      let inReplyToMessageId = null;
      if (email.task_id && email.recipient) {
        const { data: parentTask, error: taskFetchError } = await supabase
          .from("tasks")
          .select("id, type, outbound_id")
          .eq("id", email.task_id)
          .maybeSingle();

        if (!taskFetchError && parentTask && parentTask.type === "followup" && parentTask.outbound_id) {
          // Find the primary/Day 1 task of the campaign
          const { data: latestNewTask } = await supabase
            .from("tasks")
            .select("id")
            .eq("outbound_id", parentTask.outbound_id)
            .eq("type", "new")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestNewTask) {
            // Find parent email
            const { data: parentEmail } = await supabase
              .from("email_queue")
              .select("message_id")
              .eq("task_id", latestNewTask.id)
              .eq("recipient", email.recipient)
              .eq("status", "sent")
              .not("message_id", "is", null)
              .order("sent_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (parentEmail && parentEmail.message_id) {
              inReplyToMessageId = parentEmail.message_id;
              logger.info(`Thread Parent Found: Threading under parent message ID ${inReplyToMessageId}`);
            }
          }
        }
      }

      // Nodemailer transport creation
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: account.email,
          pass: account.app_password,
        },
      });

      const headers = {};
      if (inReplyToMessageId) {
        const normalized = inReplyToMessageId.trim();
        headers["In-Reply-To"] = normalized;
        headers["References"] = normalized;
      }

      let emailHtmlBody = email.body.replace(/\n/g, "<br>");
      emailHtmlBody = emailHtmlBody + "<br><br>";
      let signatureHtml = (account.signature || "").replace(/\n/g, "<br>");
      emailHtmlBody = emailHtmlBody + signatureHtml;

      const mailOptions = {
        from: `"${account.sender_name}" <${account.email}>`,
        to: email.recipient,
        subject: email.subject || "No Subject",
        text: email.body,
        html: emailHtmlBody,
        headers,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`✅ Nodemailer sent email ${emailId} successfully to ${email.recipient}`);

      // Update email status in DB
      await supabase
        .from("email_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          message_id: info.messageId || null,
        })
        .eq("id", emailId);

      // Update email accounts daily limits
      await supabase
        .from("email_accounts")
        .update({
          sent_today: (currentAccount.sent_today || 0) + 1,
          last_sent: new Date().toISOString(),
        })
        .eq("id", account.id);

      // Update parent task status
      if (email.task_id) {
        await updateTaskStatus(email.task_id);
      }

      return { success: true, message: "Email sent successfully", messageId: info.messageId };
    } catch (error) {
      logger.error(`❌ Failed to send email ID ${emailId}: ${error.message}`);
      
      // Update queue to failed
      try {
        await supabase
          .from("email_queue")
          .update({
            status: "failed",
            error_message: error.message || "Unknown error",
            sent_at: new Date().toISOString(),
          })
          .eq("id", emailId);

        // Update task status on failure too
        const { data: queueRow } = await supabase
          .from("email_queue")
          .select("task_id")
          .eq("id", emailId)
          .maybeSingle();

        if (queueRow?.task_id) {
          await updateTaskStatus(queueRow.task_id);
        }
      } catch (updateErr) {
        logger.error(`Failed to update error status for email ${emailId}: ${updateErr.message}`);
      }

      throw error; // Re-throw so Trigger.dev registers failure & retries if needed
    }
  },
});

// 2. The email-sender orchestrator task: Loops, awaits send-email subtask, and handles rate delays
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
