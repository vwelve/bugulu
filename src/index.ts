import WebhallenMonitor from "./common/webhallen";
import { Client, MessageEmbed, TextChannel } from "discord.js";
import * as dotenv from "dotenv";

dotenv.config();

const client = new Client();

client.on("ready", async () => {
    setInterval(async () => {
        const products = await WebhallenMonitor.monitor();

        const channel = <TextChannel>await client.channels.fetch(process.env.DISCORD_CHANNEL);

        products.forEach(([url, availability]) => {
            const embed = new MessageEmbed();
            const title = url.match(/\/product\/\d+-(.+)/)[1].replace("-", " ");
            const productId = url.match(/se\/product\/(\d+)/)[1];

            embed.setDescription(`[${title}](${url}) is now ${availability ? "available" : "unavailable"}`);
            embed.setImage(`https://cdn.webhallen.com/images/product/${productId}}`);
            embed.setColor(availability ? "GREEN" : "RED");
            embed.setTimestamp();


            channel.send(embed);
        });
        
    }, 30000)
});

client.on("message", async (msg) => {
    if (msg.author.bot && !msg.guild) {
        return;
    }

    const cmd = msg.content.split(" ")[0];
    const url = msg.content.split(" ")[1];

    switch(cmd) {
        case ".add":
            if (!url) {
                await msg.channel.send("You have to give a link to monitor");
            } else {
                if (await WebhallenMonitor.add(url)) {
                    await msg.channel.send(`Added ${url} to the monitor list.`);
                } else {
                    await msg.channel.send(`Something went wrong with adding that url.`);
                }
            }
        break;
        case ".remove":
            WebhallenMonitor.remove(url);
            await msg.channel.send(`Removed ${url} from the monitor list.`);
        break;
        case ".list":
            const urls = WebhallenMonitor.all();
            await msg.channel.send(`Here is the monitoring list: ${urls.join(" ")}`);
        break;
    }
});


client.login(process.env.DISCORD_TOKEN);