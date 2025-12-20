import { serve } from "bun";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";

const __dirname = path.dirname(__filename);

export function startServer(CLIENT_ID: string, CLIENT_SECRET: string, REDIRECT_URI: string) {
  const scopes = encodeURIComponent("public chat.read chat.write chat.write_manage")
  const login_url =
    `https://osu.ppy.sh/oauth/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=http://localhost:3000/callback` +
    `&response_type=code` +
    `&scope=${scopes}`;

  console.log("Please login: " + login_url);
  serve({
    port: 3000,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        if (!code) return new Response("Kein Code erhalten.");

        const tokenRes = await fetch("https://osu.ppy.sh/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
            grant_type: "authorization_code",
            redirect_uri: REDIRECT_URI,
          }),
        });

        const tokenData: any = await tokenRes.json();
        saveAccessToken(tokenData.access_token, tokenData.expires_in);
        return new Response("Login successful. You can close this tab now");
      }

      return new Response("Hello from Bun OAuth2 Server!");
    },
  });

}

async function getUserId() {
  try {
    const url = "https://osu.ppy.sh/api/v2/me";
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf-8"));
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        "Authorization": `Bearer ${config.access_token}`,
        "Content-Type": "application/json"
      },
    });
    const data: any = await response.json();
    return data.id;

  } catch (err) {

  }

}

async function saveAccessToken(token: string, expires_in: number) {

  const data = {
    access_token: token,
    expires_in: expires_in,
    date: new Date(),
    user_id: await getUserId()
  }

  fs.writeFileSync(
    path.join(__dirname, "config.json"),
    JSON.stringify(data, null, 2),
    "utf-8"
  );

  console.log("You can restart the app now");
}
