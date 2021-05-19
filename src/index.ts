import WebhallenMonitor from "./common/webhallen-monitor";
import { Client, MessageEmbed, TextChannel } from "discord.js";
import * as dotenv from "dotenv";
import Product from "./common/product";
import InetMonitor from "./common/inet-monitor";
import KomplettMonitor from "./common/komplett-monitor";

dotenv.config();

const client = new Client();

client.on("ready", async () => {
    setInterval(async () => {
        const [webhallen, inet] = await Promise.all([WebhallenMonitor.monitor(), InetMonitor.monitor()]);
        const products = [...webhallen, ...inet];

        const channel = <TextChannel>await client.channels.fetch(process.env.DISCORD_CHANNEL);

        products.forEach((product: Product) => {
            const embed = new MessageEmbed();

            embed.setDescription(`[${product.title}](${product.url})`)
            embed.addField("Availability",`${product.availability ? "available" : "unavailable"}`);
            embed.setThumbnail(product.image);
            embed.setColor(product.availability ? "GREEN" : "RED");
            embed.setTimestamp();

            channel.send(embed);
        });
        
    }, 30000);
});

function getDomain(url: string): string {
    if (/https:\/\/www\.webhallen\.com\/se\/product/.test(url)) {
        return "webhallen";
    } else if (/https:\/\/www\.inet\.se\/produkt/.test(url)) {
        return "inet";
    } else if (/https:\/\/www\.komplett\.se\/product\/\d+\//.test(url)) {
        return "komplett"
    }
}

client.on("message", async (msg) => {
    if (msg.author.bot && !msg.guild) {
        return;
    }

    const cmd = msg.content.split(" ")[0];
    const url = msg.content.split(" ")[1];

    const domain = getDomain(url);

    switch(cmd) {
        case ".add":
            if (!domain) {
                await msg.channel.send("That link is not supported.");
            } else if (domain == "webhallen") {
                WebhallenMonitor.add(url)
                await msg.channel.send(`Added ${url} to the monitor list.`);
            } else if (domain == "inet") {
                InetMonitor.add(url);
                await msg.channel.send(`Added ${url} to the monitor list.`);
            } else {
                KomplettMonitor.add(url);
                await msg.channel.send(`Added ${url} to the monitor list.`);
            }
        break;
        case ".remove":
            switch(domain) {
                case "webhallen":
                    WebhallenMonitor.remove(url);
                break;
                case "inet":
                    InetMonitor.remove(url);
                break;
                case "komplett":
                    KomplettMonitor.remove(url);
                break;
            }
            
            await msg.channel.send(`Removed ${url} from the monitor list.`);
        break;
        case ".list":
            const urls = [
                ...WebhallenMonitor.all(),
                ...InetMonitor.all(),
                ...KomplettMonitor.all()
            ];
            await msg.channel.send(`Here is the monitoring list: ${urls.join(" ")}`);
        break;
    }
});


client.login(process.env.DISCORD_TOKEN);