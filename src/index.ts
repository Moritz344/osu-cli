import { search, select, Separator } from '@inquirer/prompts';
import { startServer } from './server.ts';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf-8"));
const CLIENT_ID = "46768";
const CLIENT_SECRET: any = Bun.env.CLIENT_SECRET;
const REDIRECT_URI: any = Bun.env.REDIRECT_URI;
const base_url = "https://osu.ppy.sh/api/v2/";

function isTokenExpired() {
  return Date.now() >= config.expires_in;
}



function startOAuthFlow() {
  startServer(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}


function main() {
  if (isTokenExpired()) {
    startOAuthFlow();
  } else {
    home();
  }
}
main();

async function home() {
  try {
    const answer = await select({
      message: "Select Option \n",
      loop: false,
      pageSize: 10,
      choices: [
        {
          name: "Search for Users",
          value: "username-search"
        },
        {
          name: "Search for Beatmaps",
          value: "beatmap-search"
        },
        {
          name: "Search Events",
          value: "event-search"
        },
        {
          name: "Exit",
          value: "exit"
        },
      ]
    })

    if (answer == "username-search") {
      await searchUsername();
    } else if (answer == "beatmap-search") {
      await searchBeatmap();
    }

  } catch (err) {
    console.log("Exit.");
  }

}

async function searchUsername() {
  try {
    const answer = await search({
      message: 'Username:',
      source: async (input, { signal }) => {
        if (!input) {
          return [];
        }

        const url = base_url + `users/${encodeURIComponent(input)}/osu`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            "Authorization": `Bearer ${config.access_token}`,
            "Content-Type": "application/json"
          },
          signal
        });
        const data: any = await response.json();

        if (data.username == undefined) {
          return [];
        }

        return [{ name: data.username, value: data.username }];
      },
    });
  } catch (err) {
    await home();
  }

}

async function searchBeatmap() {
  let currentPage = 1;
  let pageLimit = 10;
  try {
    const answer = await search({
      message: 'Beatmap:',
      pageSize: 20,
      source: async (input, { signal }) => {
        if (!input) {
          return [];
        }

        const url = new URL(base_url + `beatmapsets/search`);
        url.searchParams.append("q", encodeURIComponent(input));
        url.searchParams.append("page", currentPage.toString());
        url.searchParams.append("limit", pageLimit.toString());

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            "Authorization": `Bearer ${config.access_token}`,
            "Content-Type": "application/json"
          },
          signal
        });
        const data: any = await response.json();


        return data.beatmapsets.map((beatmap: any) => ({
          name: beatmap.title,
          value: beatmap.title,
        }));
      },
    });
  } catch (err) {
    await home();
  }


}

