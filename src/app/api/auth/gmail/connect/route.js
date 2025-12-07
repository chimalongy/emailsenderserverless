// app/api/auth/gmail/connect/route.js
import { NextResponse } from "next/server";
import { google } from "googleapis";





export async function GET(req) {
  try {
    console.log("Hitting Gmail connect endpoint...");

    // ✅ Read params from query string
    const { searchParams } = new URL(req.url);

    const email_id = searchParams.get("email_id");
    const user_id = searchParams.get("user_id");
    // const sender_name = searchParams.get("sender_name");
    // const email_address = searchParams.get("email_address");
    // const sending_capacity = searchParams.get("sending_capacity");
    // const signature = searchParams.get("signature");

    console.log(searchParams)
    

    if (!user_id) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

 

    // ✅ Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI // must match in Google Cloud Console
    );
  
    // ✅ Pass custom data in `state` so it survives redirect
    const stateData = {
      email_id,
      user_id,
      // sender_name,
      // email_address,
      // sending_capacity,
      // signature
    };

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
      state: encodeURIComponent(JSON.stringify(stateData))
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Gmail connect error:", error);
    return NextResponse.json(
      { message: "Failed to initiate Gmail connection." },
      { status: 500 }
    );
  }
}
