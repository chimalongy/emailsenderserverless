import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { readEmails } from "@/app/lib/email-reader/readEmails";
import { readBouncedEmails } from "@/app/lib/email-reader/readBouncedEmails";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DEFAULT_REPLY_WINDOW_DAYS = 30;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export async function POST(req) {
  console.log("GETTTING REPLIES")
  try {

    const body = await req.json();
    const outboundId = body?.outboundId || body?.outbound_id;
    const sinceDays = sanitizeWindow(body?.sinceDays);

    if (!outboundId) {
      return NextResponse.json(
        { success: false, message: "outboundId is required." },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized request." },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const { data: outbound, error: outboundError } = await supabase
      .from("outbounds")
      .select("id, user_id, name, allocations, deleted_emails")
      .eq("id", outboundId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (outboundError) {
      throw outboundError;
    }

    if (!outbound) {
      return NextResponse.json(
        { success: false, message: "Outbound not found." },
        { status: 404 }
      );
    }

  
    // console.log(outbound);
    // console.log(user);

     const {data:tasks, error:tasksError} = await supabase
      .from("tasks")
      .select("id, name, subject, created_at, type")
      .eq("outbound_id", outboundId)
      .eq("user_id", user.id);

    if (tasksError) {
      return NextResponse.json(
        { success: false, message: "Tasks not found." },
        { status: 404 }
      );
    }

   //console.log(outbound);

   

   

    





     const { data: sentEmails, error: queueError } = await supabase
     .from("email_queue")
     .select(
       "id, recipient, subject, message_id, account_id, task_id, outbound_id, sent_at, status"
     )
     .eq("outbound_id", outboundId)
     .eq("user_id", user.id)
     .eq("status", "sent");

   if (queueError) {
    return NextResponse.json(
      { success: false, message:  queueError},
      { status: 404 }
    );
     
   }

   if (!sentEmails?.length) {
     return NextResponse.json({
       success: false,
       message: "No sent emails found for this outbound.",
       replies: [],
       meta: {
         outboundId,
         sinceDays,
         processedAccounts: 0,
       },
     });
   }






  // Get account IDs from allocations
  const allocatedAccountIds = (outbound.allocations || [])
    .map(allocation => allocation.account_id)
    .filter(id => id != null);

  if (allocatedAccountIds.length === 0) {
    return NextResponse.json({
      success: false,
      message: "No email accounts allocated for this outbound.",
      replies: [],
      meta: {
        outboundId,
        sinceDays,
        processedAccounts: 0,
        totalReplies: 0,
      },
    });
  }

  const { data: email_accounts, error: accountsError } = await supabase
    .from("email_accounts")
    .select("id, email, sender_name, refresh_token, access_token")
    .in("id", allocatedAccountIds)
    .eq("user_id", user.id);

    if (accountsError) {
      throw accountsError;
    }

    if (!email_accounts || email_accounts.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No email accounts found for allocated accounts.",
        replies: [],
        meta: {
          outboundId,
          sinceDays,
          processedAccounts: 0,
          totalReplies: 0,
        },
      });
    }

    console.log(`Found ${email_accounts.length} email accounts to process`);

    // Sort tasks once before the loop (optimization)
    const sortedTasks = tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const latestNewTask = sortedTasks.find(item => item.type === "new");
    
    if (!latestNewTask) {
      return NextResponse.json({
        success: false,
        message: "No 'new' type task found for this outbound.",
        replies: [],
        deleted_emails: outbound.deleted_emails || '',
        meta: {
          outboundId,
          sinceDays,
          processedAccounts: 0,
          totalReplies: 0,
        },
      });
    }

    const subject = latestNewTask.subject || "";
    const replies = [];

    for (const emailaccount of email_accounts) {
      console.log(`Processing account: ${emailaccount.email}`);

      const queueEntries = sentEmails.filter(
        (email) => email.account_id === emailaccount.id
      );
      
      const uniqueByRecipients = Array.from(
        new Map(queueEntries.map(item => [item.recipient, item])).values()
      );

      if (!queueEntries.length) continue;


        const payload  = {
          emailAddress: emailaccount.email,
          list:uniqueByRecipients.map(item=>item.recipient),
          refreshToken:emailaccount.refresh_token,
          accessToken:emailaccount.access_token,
          subject:subject,
        }


        //console.log(payload);
        
 
      if (!emailaccount.access_token || !emailaccount.refresh_token) {
        console.log("Skipping emails for:", emailaccount.email, "- missing tokens");
        continue;
      }

      console.log(`Calling readEmails for ${emailaccount.email} with ${payload.list.length} recipients`);
      
      let accountReplies = [];
      let accountBounces = [];
      
      try {
        accountReplies = await readEmails(
          payload.emailAddress, 
          payload.list, 
          payload.refreshToken, 
          payload.accessToken, 
          payload.subject
        );
        console.log(`readEmails returned ${accountReplies.length} replies for ${emailaccount.email}`);
        
        accountBounces = await readBouncedEmails(
          payload.emailAddress, 
          payload.list, 
          payload.refreshToken, 
          payload.accessToken
        );
        console.log(`readBouncedEmails returned ${accountBounces.length} bounces for ${emailaccount.email}`);
      } catch (error) {
        console.error(`Error reading emails for ${emailaccount.email}:`, error);
        // Continue with next account instead of failing completely
        continue;
      }

      // Filter replies to only include those from recipients in our list
      accountReplies.forEach((reply) => {
        const sender_email = extractEmail(reply.from);
        
        
        // Skip if we can't extract the sender email
        if (!sender_email) {
          return;
        }
        let sender_email_domain= fromEmail.split("@");
        sender_email_domain= sender_email_domain[1]
        
        const sender_subject = reply.subject || '';
        
        if (uniqueByRecipients.some(emailItem => 
          (emailItem.recipient === sender_email || emailItem.recipient.split("@")[1].toLowerCase()==sender_email_domain) && 
          sender_subject.includes(emailItem.subject)
        )) {
          replies.push(reply);
        }
      });
        replies.push(...accountBounces)
     // console.log(accountReplies)

    
       
    }

    // Filter out replies from deleted emails
    const deletedEmailList = (outbound.deleted_emails || '')
      .split('\n')
      .map(email => email.toLowerCase().trim())
      .filter(email => email.length > 0);

    const filteredReplies = replies.filter(reply => {
      let fromEmail = extractEmail(reply.from || '').toLowerCase();
      
      
      // For bounce emails, check the receiver field
      if (reply.receiver && deletedEmailList.includes(reply.receiver.toLowerCase())) {
        return false;
      }
      
      // For regular replies, check if sender email is in deleted list
      if (fromEmail && deletedEmailList.includes(fromEmail.toLowerCase())) {
        return false; 
      }
      
      return true;
    });

    return NextResponse.json({
      success: true,
      message: "Replies retrieved successfully.",
      replies: filteredReplies,
      deleted_emails: outbound.deleted_emails || '',
      meta: {
        outboundId,
        sinceDays,
        processedAccounts: email_accounts.length,
        totalReplies: filteredReplies.length,
      },
    });
  } catch (error) {
    console.error("retrieving emails failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}

function sanitizeWindow(value) {
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) {
    return Math.min(Math.round(num), 120);
  }
  return DEFAULT_REPLY_WINDOW_DAYS;
}


function extractEmail(str) {
  const emailRegex = /<([^>]+)>/;   // captures the email inside <...>

  const match = str.match(emailRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  return null; // if no email found
}