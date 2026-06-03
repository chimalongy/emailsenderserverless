import { task, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { llmPlanAutoOutbound } from "../app/lib/LLMCenter/LLM-central.js";
import { scheduleEmail } from "../app/lib/qstash.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const autoOutboundPlannerTask = task({
  id: "auto-outbound-planner",
  run: async (payload) => {
    const { autoOutbound } = payload;

    if (!autoOutbound) {
      logger.error("❌ No autoOutbound payload provided.");
      return { success: false, error: "Missing autoOutbound payload" };
    }

    logger.info(`📋 Starting auto outbound planning for campaign: "${autoOutbound.name}" (ID: ${autoOutbound.id})`);

    try {
      // 1. Fetch the scraped emails
      if (!autoOutbound.scrape_id) {
        logger.warn(`⚠️ No scrape_id associated with auto outbound ${autoOutbound.id}.`);
        return { success: false, error: "No scrape_id associated" };
      }

      const { data: scrapeData, error: scrapeError } = await supabase
        .from("scrappings")
        .select("emails")
        .eq("id", autoOutbound.scrape_id)
        .single();

      if (scrapeError || !scrapeData) {
        logger.error("💥 Error fetching scrape data:", scrapeError);
        return { success: false, error: "Failed to fetch scrape data" };
      }

      const emailsList = [];
      if (scrapeData.emails) {
        scrapeData.emails.forEach(item => {
          if (item.emails && Array.isArray(item.emails)) {
            item.emails.forEach(email => {
              if (email && !emailsList.includes(email.trim().toLowerCase())) {
                emailsList.push(email.trim().toLowerCase());
              }
            });
          }
        });
      }

      if (emailsList.length === 0) {
        logger.warn("⚠️ No emails found in the scrape results.");
        return { success: false, error: "No emails found in scrape results" };
      }

      logger.info(`📧 Extracted ${emailsList.length} unique emails from scrape results.`);

      // 2. Fetch user information for previous allocation state
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("last_allocated_email, last_allocated_email_remainder")
        .eq("id", autoOutbound.user_id)
        .single();

      if (userError) {
        logger.error("💥 Error fetching user data:", userError);
        return { success: false, error: "Failed to fetch user data" };
      }

      let prospectsToAllocate = [];
      if (userData.last_allocated_email_remainder) {
        prospectsToAllocate = userData.last_allocated_email_remainder
          .split(",")
          .map(e => e.trim())
          .filter(Boolean);
      }
      if (prospectsToAllocate.length === 0) {
        prospectsToAllocate = emailsList;
      }

      if (prospectsToAllocate.length === 0) {
        logger.warn("⚠️ No prospects available to allocate.");
        return { success: false, error: "No prospects to allocate" };
      }

      // 3. Fetch active sending email accounts
      const { data: emailAccounts, error: accountsError } = await supabase
        .from("email_accounts")
        .select("*")
        .eq("user_id", autoOutbound.user_id)
        .eq("active", true);

      if (accountsError || !emailAccounts || emailAccounts.length === 0) {
        logger.error("💥 Error fetching active email accounts:", accountsError);
        return { success: false, error: "No active email accounts found" };
      }

      // 4. Fetch existing scheduled tasks to prevent conflict
      const { data: existingTasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, name, scheduled_at, status")
        .eq("user_id", autoOutbound.user_id)
        .eq("status", "scheduled");

      if (tasksError) {
        logger.error("💥 Error fetching existing tasks:", tasksError);
        return { success: false, error: "Failed to fetch existing tasks" };
      }

      // 5. Trigger LLM Planner
      logger.info("🤖 Calling LLM Planner to schedule tasks and rewrite email sequences...");
      const result = await llmPlanAutoOutbound({
        domain: autoOutbound.domain,
        endUsersList: prospectsToAllocate,
        sendingGmailAccounts: emailAccounts.map(acc => ({
          id: acc.id,
          email: acc.email,
          sender_name: acc.sender_name,
          daily_limit: acc.daily_limit,
          sent_today: acc.sent_today,
          last_sent: acc.last_sent
        })),
        existingTasks: existingTasks || [],
        lastAllocatedEmail: userData.last_allocated_email || "",
        startDate: autoOutbound.start_date
      });

      if (!result || !result.allocations || !result.tasks) {
        logger.error("❌ Invalid response from LLM planner:", result);
        return { success: false, error: "Invalid LLM planner response" };
      }

      logger.info("✅ LLM Planner returned layout:", JSON.stringify(result));

      // 6. Update allocations in auto_outbounds
      const { error: outboundUpdateError } = await supabase
        .from("auto_outbounds")
        .update({ allocations: result.allocations })
        .eq("id", autoOutbound.id);

      if (outboundUpdateError) {
        logger.error("💥 Error updating auto outbound allocations:", outboundUpdateError);
        return { success: false, error: "Failed to update campaign allocations" };
      }

      // 7. Update user allocation cursor
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          last_allocated_email: result.last_allocated_email,
          last_allocated_email_remainder: result.last_allocated_email_remainder
        })
        .eq("id", autoOutbound.user_id);

      if (userUpdateError) {
        logger.error("💥 Error updating user allocation cursor:", userUpdateError);
        return { success: false, error: "Failed to update user allocation state" };
      }

      // 8. Determine allocated prospects list for this run
      const totalAllocated = result.allocations.reduce((sum, a) => sum + (a.allocated_emails || 0), 0);
      const allocatedProspects = prospectsToAllocate.slice(0, totalAllocated);

      if (allocatedProspects.length === 0) {
        logger.warn("⚠️ LLM allocated 0 prospects for this run.");
        return { success: true, message: "No prospects allocated in this run." };
      }

      // 9. Save Tasks to Database
      const tasksToInsert = result.tasks.map(t => ({
        outbound_id: autoOutbound.id,
        name: t.name,
        type: t.type,
        body: t.body,
        scheduled_at: t.scheduled_at,
        send_rate: t.send_rate || 5,
        status: "scheduled",
        user_id: autoOutbound.user_id,
        subject: t.subject
      }));

      const { data: createdTasks, error: tasksInsertError } = await supabase
        .from("tasks")
        .insert(tasksToInsert)
        .select();

      if (tasksInsertError || !createdTasks) {
        logger.error("💥 Error inserting tasks:", tasksInsertError);
        return { success: false, error: "Failed to insert tasks" };
      }

      logger.info(`✅ Created ${createdTasks.length} tasks in the database.`);

      // 10. Generate and insert Email Queue entries for all tasks
      const emailQueueEntries = [];
      createdTasks.forEach(task => {
        let emailIndex = 0;
        result.allocations.forEach(allocation => {
          const allocatedCount = allocation.allocated_emails || 0;
          for (let i = 0; i < allocatedCount && emailIndex < allocatedProspects.length; i++) {
            emailQueueEntries.push({
              user_id: autoOutbound.user_id,
              outbound_id: autoOutbound.id,
              task_id: task.id,
              account_id: allocation.account_id,
              recipient: allocatedProspects[emailIndex],
              subject: task.subject,
              body: task.body,
              scheduled_at: task.scheduled_at,
              status: "pending"
            });
            emailIndex++;
          }
        });
      });

      const { error: queueInsertError } = await supabase
        .from("email_queue")
        .insert(emailQueueEntries);

      if (queueInsertError) {
        logger.error("💥 Error inserting email queue entries:", queueInsertError);
        return { success: false, error: "Failed to create email queue" };
      }

      logger.info(`✅ Created ${emailQueueEntries.length} email queue entries.`);

      // 11. Schedule the emails with QStash for each task
      for (const task of createdTasks) {
        const { data: pendingEmails, error: pendingFetchError } = await supabase
          .from("email_queue")
          .select("id, status, recipient")
          .eq("task_id", task.id);

        if (pendingFetchError || !pendingEmails) {
          logger.error(`💥 Error fetching pending emails for task ${task.id}:`, pendingFetchError);
          continue;
        }

        logger.info(`🚀 Scheduling ${pendingEmails.length} emails for task "${task.name}"...`);

        const baseTime = new Date(task.scheduled_at).getTime();
        const sendRate = task.send_rate || 5;
        const now = Date.now();

        for (let i = 0; i < pendingEmails.length; i++) {
          const email = pendingEmails[i];
          const delay = i * sendRate * 1000;
          const scheduledTime = baseTime + delay;

          try {
            if (scheduledTime > now) {
              await scheduleEmail(email.id, task.id, scheduledTime, autoOutbound.user_id);
              await supabase
                .from("email_queue")
                .update({
                  scheduled_at: new Date(scheduledTime).toISOString(),
                  status: "scheduled"
                })
                .eq("id", email.id);
            } else {
              await supabase
                .from("email_queue")
                .update({
                  status: "failed",
                  error_message: "Scheduled time in the past"
                })
                .eq("id", email.id);
            }
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

      logger.info("🎉 Auto outbound planning completed successfully!");
      return { success: true, message: "Campaign planned and scheduled successfully." };

    } catch (err) {
      logger.error("💥 Unexpected error in autoOutboundPlannerTask:", err);
      return { success: false, error: err.message };
    }
  },
});

