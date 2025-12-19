import { search, select, Separator, input } from '@inquirer/prompts';
import { startServer } from './server.ts';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';


const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf-8"));
const CLIENT_ID = 46768;
const CLIENT_SECRET: any = Bun.env.CLIENT_SECRET;
const REDIRECT_URI: any = Bun.env.REDIRECT_URI;
const base_url = "https://osu.ppy.sh/api/v2/";

// TODO: limit changelogs

function isTokenExpired() {
  return Date.now() >= config.expires_in;
}



function startOAuthFlow() {
  startServer(CLIENT_ID.toString(), CLIENT_SECRET, REDIRECT_URI);
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
  console.clear();
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
          name: "Latest Changelog",
          value: "changelog-search"
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
    } else if (answer == "changelog-search") {
      await showChangelog();
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

        const url = base_url + `search?query=${encodeURIComponent(input)}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            "Authorization": `Bearer ${config.access_token}`,
            "Content-Type": "application/json"
          },
          signal
        });
        const data: any = await response.json();

        const users = data.user.data;

        return users.map((user: any) => ({
          name: user.username,
          value: user.id,
        }));
      },
    });
    await showUserData(answer, "osu");
  } catch (err) {
    if (err instanceof Error && err.name === "ExitPromptError") {
      await home();
    }
  }
}
async function showUserData(id: unknown, mode?: string) {
  console.clear();
  try {
    const url = base_url + "users/" + id + "/" + mode;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        "Authorization": `Bearer ${config.access_token}`,
        "Content-Type": "application/json"
      },
    })
    const data: any = await response.json();
    const user = {
      name: data.username,
      online: data.is_online,
      join_date: data.join_date,
      playstyle: data.playstyle,
      country: data.country.name,
      follower: data.follower_count,
      color: data.profile_colour,
      pp: data.statistics.pp,
      rank: data.statistics.global_rank,
      country_rank: data.statistics.country_rank,
      playtime: data.statistics.play_time

    };
    console.log(chalk.hex("#FF6FAE")(user.name));
    let a = [];
    for (let i = 0; i < user.name.length; i++) {
      a.push("-");
    }
    console.log(a.join(""));
    if (user.online == true) {
      console.log(chalk.hex("#7ED321")("Online"));
    } else {
      console.log(chalk.hex("#FF4D4D")("Offline"));
    }
    console.log("Score: " + user.pp + "pp" + " (Global #" + user.rank + ")" + " (Country #" + user.country_rank + ")");
    console.log("Country: " + user.country);
    console.log("Followers: " + user.follower);
    if (user.playstyle != null) {
      console.log("Playstyle: " + user.playstyle.join(","));
    }

    console.log("Join Date: " + new Date(user.join_date).toDateString());
    await searchUsername();
  } catch (err) {

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
          value: beatmap.id,
        }));
      },
    });
    if (answer) {
      await showBeatmap(answer);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "ExitPromptError") {
      await home();
    }

  }


}

async function showBeatmap(id: unknown) {
  console.clear();
  try {
    const url = base_url + "beatmapsets/" + id;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        "Authorization": `Bearer ${config.access_token}`,
        "Content-Type": "application/json"
      },
    })
    const data: any = await response.json();
    const beatmap = {
      name: data.title,
      artist: data.artist,
      creator: data.creator,
      play_count: data.play_count,
      status: data.status,
      video: data.video,
      bpm: data.bpm,
    };
    let a = [];
    console.log(chalk.hex("#FF4D4D")(beatmap.name));
    for (let i = 0; i < beatmap.name.length; i++) {
      a.push("-");
    }
    console.log(a.join(""));
    console.log("Artist: " + beatmap.artist);
    console.log("Creator: " + beatmap.creator);
    console.log("Play Count: " + beatmap.play_count);
    console.log("BPM: " + beatmap.bpm);
    console.log();
    console.log("Beatmaps");
    console.log("--------")
    for (let i = 0; i < data.beatmaps.length; i++) {
      console.log(data.beatmaps[i].version, chalk.yellow(data.beatmaps[i].difficulty_rating + "*"));
    }
    console.log();
    await searchBeatmap();
  } catch (err) {

  }

}

async function getLatestChangelogBuild() {
  try {
    const url = base_url + "changelog/lazer";
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        "Authorization": `Bearer ${config.access_token}`,
        "Content-Type": "application/json"
      },
    });
    const data: any = await response.json();
    const latest_build = data.changelog_entries;
    return latest_build[0];

  } catch (err) {
    console.log(err);
  }
}

async function showChangelog() {
  console.clear();
  const data = await getLatestChangelogBuild();
  const entry = {
    name: data.title,
    msg: data.message,
    category: data.category,
    user: data.github_user.display_name,
    id: data.id
  }
  let a = [];
  console.log(chalk.hex("#FF4D4D")(entry.name));
  for (let i = 0; i < entry.name.length; i++) {
    a.push("-");
  }
  console.log("id: " + entry.id);
  console.log("Category: " + entry.category);
  console.log("User: " + entry.user);
  console.log();
  console.log("Message:");
  console.log(entry.msg);

  const answer = await input({ message: 'Go back? (y/N)' });
  if (answer == "y") {
    await home();
  } else {
    await showChangelog();
  }

}

