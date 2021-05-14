import puppeteer from "puppeteer";
import { Page } from "puppeteer";
import Enmap from "enmap";
import axios from 'axios';

class WebhallenMonitor {
    
    static enmap = new Enmap<string, boolean>("monitor");

    public static async add(url: string) {
        if (/https:\/\/www\.webhallen\.com\/se\/product/.test(url) && (await axios.get(url).catch(e => false))) {
            this.enmap.set(url, false);

            return true;
        }
        return false;        
    }

    public static remove(url: string) {
        this.enmap.delete(url);   
    }

    public static all() {
        return this.enmap.keyArray();
    }

    public static async monitor(): Promise<[string, boolean][]> {
        const browser = await puppeteer.launch();
        const urls = this.enmap.keyArray();
        // string is url and boolean is whether it is available or not
        const monitors: Promise<[string, boolean]>[] = [];

        for (const url of urls) {
            monitors.push(new Promise(async (resolve) => {
                const page = await browser.newPage();

                resolve(await this.parse(page, url));
            }));
        }

        // remove products that availability didn't change
        const products = (await Promise.all(monitors)).filter(([url, bool]) => bool != this.enmap.get(url));
        await browser.close();

        // update availability
        for (const [url, availability] of products) {
            console.log(availability);
            this.enmap.set(url, availability);
            console.log(!availability)
        }
        console.log(products)
        return products;
    }

    public static async parse(page: Page, url: string): Promise<[string, boolean]> {
        await page.goto(url, { waitUntil: 'networkidle0' }).catch(err => console.log(err));

        const el = await page.$('.btn-preorder');

        return [page.url(), !el] ;
    }
}

export default WebhallenMonitor;