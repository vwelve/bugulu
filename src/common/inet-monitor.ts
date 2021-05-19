import puppeteer from "puppeteer";
import { Page } from "puppeteer";
import Enmap from "enmap";
import Product from "./product";

class InetMonitor {
    
    static enmap = new Enmap<string, boolean>("inet-monitor");

    public static add(url: string) {
        this.enmap.set(url, false);      
    }

    public static remove(url: string) {
        this.enmap.delete(url);   
    }

    public static all() {
        return this.enmap.keyArray();
    }

    public static async monitor(): Promise<Product[]> {
        const browser = await puppeteer.launch();
        const urls = this.enmap.keyArray();
        // string is url and boolean is whether it is available or not
        const monitors: Promise<Product>[] = [];

        for (const url of urls) {
            monitors.push(new Promise(async (resolve) => {
                const page = await browser.newPage();

                resolve(await this.parse(page, url));
            }));
        }

        // remove products that availability didn't change
        const products = (await Promise.all(monitors)).filter(({url, availability}) => availability != this.enmap.get(url));
        await browser.close();

        // update availability
        for (const { url, availability } of products) {
            this.enmap.set(url, availability);
        }
        
        return products;
    }

    public static async parse(page: Page, url: string): Promise<Product> {
        await page.goto(url, { waitUntil: 'networkidle0' }).catch(err => console.log("Something went wrong with: "+ url));

        const el = await page.$('.blocked');
        const productId = url.match(/(\d+)/)[1];
        const title = url.match(/\d+\/(.+)/)[1].replace(/-/g, " ");

        return {
            domain: "www.inet.se",
            availability: !el,
            url,
            image: `https://inetimg3.se/img/688x386/${productId}_0.jpg`,
            title
        };
    }
}

export default InetMonitor;