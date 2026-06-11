import { task, logger, tasks } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { llmPlanAutoOutbound } from "../app/lib/LLMCenter/LLM-central.js";
import { allocateEmails } from "../app/lib/allocation.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getSequenceDates(startDateStr, busyDates) {
  let start = new Date(startDateStr);
  
  while (true) {
    const d1 = new Date(start);
    const d2 = new Date(start); d2.setDate(d2.getDate() + 1);
    const d3 = new Date(start); d3.setDate(d3.getDate() + 4);
    const d4 = new Date(start); d4.setDate(d4.getDate() + 5);

    const format = (d) => d.toISOString().split('T')[0];

    const hasConflict = busyDates.has(format(d1)) ||
                        busyDates.has(format(d2)) ||
                        busyDates.has(format(d3)) ||
                        busyDates.has(format(d4));

    if (!hasConflict) {
      return [d1.toISOString(), d2.toISOString(), d3.toISOString(), d4.toISOString()];
    }

    start.setDate(start.getDate() + 1);
  }
}

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
        .select("last_allocated_email, last_allocated_email_remainder, sales_letter_templates")
        .eq("id", autoOutbound.user_id)
        .single();

      if (userError) {
        logger.error("💥 Error fetching user data:", userError);
        return { success: false, error: "Failed to fetch user data" };
      }

      // 2b. Fetch already queued/sent email recipients for this user to avoid duplication
      const { data: queuedEmails, error: queueFetchError } = await supabase
        .from("email_queue")
        .select("recipient")
        .eq("user_id", autoOutbound.user_id);

      if (queueFetchError) {
        logger.error("💥 Error fetching queued emails:", queueFetchError);
        return { success: false, error: "Failed to fetch queued emails" };
      }

      const queuedSet = new Set(queuedEmails ? queuedEmails.map(q => q.recipient.trim().toLowerCase()) : []);
      const prospectsToAllocate = emailsList.filter(email => !queuedSet.has(email));

      if (prospectsToAllocate.length === 0) {
        logger.warn("⚠️ No prospects available to allocate (all prospects in this scrape run have already been queued/sent).");
        return { success: true, message: "No new prospects to allocate." };
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

      // 5. Allocate emails programmatically
      const programmaticAllocation = allocateEmails(
        prospectsToAllocate,
        emailAccounts,
        userData.last_allocated_email || "",
        userData.last_allocated_email_remainder !== null && userData.last_allocated_email_remainder !== undefined
          ? parseInt(userData.last_allocated_email_remainder)
          : 0
      );

      logger.info(`📊 Programmatic email allocation layout calculated: ${JSON.stringify(programmaticAllocation)}`);

      // 6. Trigger LLM Planner for sequence copywriting and task scheduling
      logger.info("🤖 Calling LLM Planner to schedule tasks and rewrite email sequences...");
      const llmResult = await llmPlanAutoOutbound({
        domain: autoOutbound.domain,
        existingTasks: existingTasks || [],
        startDate: autoOutbound.start_date,
        price: autoOutbound.price || undefined,
        userSalesLetterTemplates: userData.sales_letter_templates || {}
      });

      if (!llmResult || !llmResult.tasks) {
        logger.error("❌ Invalid response from LLM planner:", llmResult);
        return { success: false, error: "Invalid LLM planner response" };
      }

      // Merge LLM tasks with deterministic programmatic allocation results
      const result = {
        tasks: llmResult.tasks,
        allocations: programmaticAllocation.allocations,
        last_allocated_email: programmaticAllocation.last_allocated_email,
        last_allocated_email_remainder: programmaticAllocation.last_allocated_email_remainder
      };

      logger.info("✅ LLM Planner returned sequence plan, combined with programmatic allocation:", JSON.stringify(result));

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

      // 9. Create a new campaign in outbounds table
      logger.info(`📝 Creating new campaign in outbounds table...`);
      const { data: createdOutbound, error: outboundInsertError } = await supabase
        .from("outbounds")
        .insert({
          user_id: autoOutbound.user_id,
          name: autoOutbound.name,
          status: "active",
          email_list: allocatedProspects.join("\n"),
          allocations: result.allocations,
        })
        .select()
        .single();

      if (outboundInsertError || !createdOutbound) {
        logger.error("💥 Error creating campaign in outbounds table:", outboundInsertError);
        return { success: false, error: "Failed to create campaign in outbounds table" };
      }

      logger.info(`✅ Created campaign "${createdOutbound.name}" (ID: ${createdOutbound.id}) in outbounds table.`);

      // 10. Save Tasks to Database
      // Calculate sequence dates deterministically based on user selected start_date & time
      const busyDates = new Set(existingTasks ? existingTasks.map(t => t.scheduled_at.split('T')[0]) : []);
      const sequenceDates = getSequenceDates(autoOutbound.start_date, busyDates);
      logger.info(`📅 Calculated deterministic sequence dates: ${JSON.stringify(sequenceDates)}`);

      // Sort tasks by name to guarantee sequence order: Task 1, Task 2, Task 3, Task 4
      const sortedTasks = [...result.tasks].sort((a, b) => {
        const numA = parseInt(a.name?.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name?.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      const tasksToInsert = sortedTasks.map((t, idx) => ({
        outbound_id: createdOutbound.id,
        name: t.name,
        type: t.type,
        body: t.body,
        scheduled_at: sequenceDates[idx] || t.scheduled_at,
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

      // 11. Generate and insert Email Queue entries for all tasks
      const emailQueueEntries = [];
      createdTasks.forEach(task => {
        let emailIndex = 0;
        result.allocations.forEach(allocation => {
          const allocatedCount = allocation.allocated_emails || 0;
          for (let i = 0; i < allocatedCount && emailIndex < allocatedProspects.length; i++) {
            emailQueueEntries.push({
              user_id: autoOutbound.user_id,
              outbound_id: createdOutbound.id,
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

      // If start_date is today, run autoEmailScheduler immediately
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const startStr = new Date(autoOutbound.start_date).toISOString().split("T")[0];
        if (todayStr === startStr) {
          logger.info("📅 Campaign start date is today! Triggering auto-email-scheduler immediately...");
          await tasks.trigger("auto-email-scheduler", { timestamp: new Date().toISOString() });
        } else {
          logger.info(`📅 Campaign start date is ${startStr} (today is ${todayStr}). Will be scheduled via daily cron.`);
        }
      } catch (scheduleErr) {
        logger.error("💥 Failed to check/trigger auto-email-scheduler:", scheduleErr);
      }

      logger.info("🎉 Auto outbound planning completed successfully!");
      return { success: true, message: "Campaign planned and tasks saved as scheduled successfully." };

    } catch (err) {
      logger.error("💥 Unexpected error in autoOutboundPlannerTask:", err);
      return { success: false, error: err.message };
    }
  },
});

