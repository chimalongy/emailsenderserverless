// app/api/auth/gmail/callback/route.js
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});




export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      return NextResponse.json(
        { message: "Missing authorization code" },
        { status: 400 }
      );
    }
    if (!state) {
      return NextResponse.json(
        { message: "Missing state data" },
        { status: 400 }
      );
    }

    // ✅ Decode the state back into an object
    const stateData = JSON.parse(decodeURIComponent(state));
    const { email_id, user_id } =
      stateData;
      console.log('STATE DATA')
      console.log(stateData)

    console.log("OAuth State Data:", stateData);

    // ✅ Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  

    // ✅ Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;
    const accessToken = tokens.access_token;


    if (!refreshToken) {
      return NextResponse.json(
        { message: "No refresh token received" },
        { status: 400 }
      );
    }


    // ✅ Store refresh token and access token in Supabase
    const fieldsToUpdate = {
      access_token: accessToken,
      refresh_token: refreshToken,
    };

    const { error: updateError } = await supabase
      .from("email_accounts")
      .update(fieldsToUpdate)
      .eq("id", email_id)
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Failed to update email account with tokens:", updateError);
      return NextResponse.json(
        { message: "Failed to save Gmail tokens. Please try again." },
        { status: 500 }
      );
    }

    // ✅ Redirect to dashboard
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/emails?gmail_connected=true`
    );
  } catch (error) {
    console.error("Gmail callback error:", error);
    return NextResponse.json(
      { message: "Failed to complete Gmail connection." },
      { status: 500 }
    );
  }
}
