const puppeteer = require('puppeteer');

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

(async () => {
    console.log("Starting puppeteer...");
    const browser = await puppeteer.launch({headless: false});
    const mainPage = await browser.newPage();
    const detailPostPage = await browser.newPage();
    let index = 0;
    while(true) {
        const targetUrl = `http://www.onegreatlifestyle.com/index.html?cate_id=5170&page=${index}`;

        console.log('Requesting the target url: "%s"', targetUrl);
        await mainPage.goto(targetUrl, {waitUntil: 'domcontentloaded'});
        console.log('Finished loading the target url');

        const arrayOfPosts = await mainPage.$$('div.list-item.io');
        if (arrayOfPosts.length === 0) {
            console.log('No more posts found, exiting...');
            break;
        }
        for (const post of arrayOfPosts) {
            let link = await post.$eval('h3>a', el => el.href);
            const title = await post.$eval('h3>a', el => el.innerText);
            const image = await post.$eval('a>img', el => el.src);
            const category = await post.$eval('div>span.category',
                el => el.innerText);
            const time = await post.$eval('div>span.time',
                    el => el.innerText);
            console.log('detailLink: "%s", title: "%s", image: "%s", category: "%s", time: "%s".',
                link, title, image, category, time);

            let currentPage = 1;
            let maxPage = 1; //default, will be updated later

            do {
                await detailPostPage.goto(link, {waitUntil: 'domcontentloaded'});
                const detailImage = await detailPostPage.$eval('div.page>img',
                    el => el.src);
                const text = (await detailPostPage.$eval('div.text',
                    el => el.innerText))
                    .replaceAll("\n", "")
                    .trim();
                link = await detailPostPage.$eval('div.right>span>a', el => el.href);
                maxPage = parseInt(await detailPostPage.$eval('span.count-pageindex',
                    el => el.innerText), 10);

                console.log('detailImage: "%s", text: "%s", nextPageLink: "%s", currentPage: "%s", maxPage: "%s".',
                    detailImage, text, link, currentPage, maxPage);
                currentPage++;
                await delay(3000);
            } while (currentPage <= maxPage);
        }
        index++;
    }

    console.log("Cleaning up the puppeteer job...");
    await browser.close();
    console.log("Finished the puppeteer job.");
})();
