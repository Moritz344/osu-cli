import { serve } from "bun";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";

const __dirname = path.dirname(__filename);

export function startServer(CLIENT_ID: string, CLIENT_SECRET: string, REDIRECT_URI: string) {
  const login_url = "https://osu.ppy.sh/oauth/authorize?client_id=" + CLIENT_ID + "&redirect_uri=http://localhost:3000/callback&response_type=code&scope=public";
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


function saveAccessToken(token: string, expires_in: number) {

  const data = {
    access_token: token,
    expires_in: Date.now() + expires_in * 1000
  }

  fs.writeFileSync(
    path.join(__dirname, "config.json"),
    JSON.stringify(data, null, 2),
    "utf-8"
  );

}
