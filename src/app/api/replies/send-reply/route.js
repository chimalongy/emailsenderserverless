import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export async function POST(request) {
  const body = await request.json();
  const {
    outboundId,
    replyId,
    to,
    subject,
    body: emailBody,
    accountEmail,
    inReplyTo,
  } = body;

  if (!outboundId || !to || !subject || !emailBody) {
    return NextResponse.json(
      { success: false, message: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    // if (!outboundId) {
    //     return NextResponse.json(
    //       { success: false, message: "outboundId is required." },
    //       { status: 400 }
    //     );
    //   }

    const authHeader = request.headers.get("authorization");
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
      .select("id, user_id, name, allocations")
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

    const { data: tasks, error: tasksError } = await supabase
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
        { success: false, message: queueError },
        { status: 404 }
      );
    }

    if (!sentEmails?.length) {
      return NextResponse.json({
        success: true,
        message: "No sent emails found for this outbound.",
        replies: [],
        meta: {
          outboundId,
          sinceDays,
          processedAccounts: 0,
        },
      });
    }

    let { data: email_account, error: accountsError } = await supabase
      .from("email_accounts")
      .select("id, email, sender_name, app_password")
      .eq("user_id", user.id)
      .eq("email", accountEmail);

    if (accountsError) {
      throw accountsError;
    }
        
        let account = email_account[0];
        email_account=account

    console.log(email_account);

    const queueEntries = sentEmails.filter(
      (email) => email.account_id === email_account.id
    );
    //console.log(tasks)
    let sortedtasks = tasks.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    const latestnewtask = sortedtasks.find((item) => item.type == "new");
    let onemessage = queueEntries.filter(
      (item) => item.task_id === latestnewtask.id
    )[0];
    let latestsubject = latestnewtask.subject;

    //getting message id
    //console.log(sentEmails)
    //let first_task_message =  sentEmails.filter((sntemail)=>sntemail.)

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: email_account.email,
          pass: email_account.app_password
        }
      })

    const info = await transporter.sendMail({
      from: `"${email_account.sender_name}" <${email_account.user}>`,
      to: to,
      subject: latestsubject,

      // 👇 IMPORTANT FOR REPLYING 👇
      inReplyTo: inReplyTo,
      references: [inReplyTo],

      html: emailBody,
    });

    console.log(info);

    // Your email sending logic here
    console.log("Sending reply:", {
      outboundId,
      replyId,
      to,
      subject,
      emailBody,
    });

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return NextResponse.json({
      success: true,
      message: "Reply sent successfully",
      data: {
        messageId: `mock-${Date.now()}`,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in send-reply API:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
