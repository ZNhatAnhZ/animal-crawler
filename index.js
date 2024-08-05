const puppeteer = require('puppeteer');
const {
    initializeConnectionPool,
    insertPost,
    closingConnectionPool
} = require("./databaseManangement");
const { downloadFile } = require("./downloadImage");
const {delay} = require("./util");

const objArgStr = process.argv[2];

if (!objArgStr) {
    console.error('No argument provided.');
    process.exit(1);
}

const objArg = JSON.parse(objArgStr);
console.log('Object argument: ', objArg);

(async () => {
    console.log("Starting puppeteer...");
    const browser = await puppeteer.launch({headless: false});
    const mainPage = await browser.newPage();
    const detailPostPage = await browser.newPage();
    const imagePage = await browser.newPage();
    let index = 1;
    const maxIndex = 60;
    initializeConnectionPool(objArgStr);

    while(index <= maxIndex) {
        const targetUrl = `http://www.onegreatlifestyle.com/index.html?cate_id=5170&page=${index}`;

        console.log('Requesting the target url: "%s".', targetUrl);
        try {
            await mainPage.goto(targetUrl, {waitUntil: 'domcontentloaded'});
            console.log('Finished loading the target url.');

            const arrayOfPosts = await mainPage.$$('div.list-item.io');
            if (arrayOfPosts.length === 0) {
                console.log('No more posts found, exiting...');
                break;
            }
            for (const post of arrayOfPosts) {
                try {
                    let link = await post.$eval('h3>a', el => el.href);
                    const title = await post.$eval('h3>a', el => el.innerText);
                    const image = await post.$eval('a>img', el => el.src);
                    const category = await post.$eval('div>span.category', el => el.innerText);
                    const time = await post.$eval('div>span.time', el => el.innerText);
                    const newsId = link.match(/news_id=(\d+)/)[1];
                    await downloadFile(imagePage, image, `${newsId}.jpg`);
                    console.log('newsId: "%s", title: "%s", detailLink: "%s", image: "%s", category: "%s", time: "%s".', newsId, title, link, image, category, time);

                    let currentPage = 1;
                    let maxPage = 1; //default, will be updated later
                    let arrayOfImages = [image];
                    let content = '';

                    try {
                        do {
                            await detailPostPage.goto(link, {waitUntil: 'domcontentloaded'});
                            const detailImage = await detailPostPage.$eval('div.page>img', el => el.src);
                            const text = (await detailPostPage.$eval('div.text', el => el.innerText)).replaceAll("\n", "").trim();
                            content += text + " ";
                            arrayOfImages.push(detailImage);
                            link = await detailPostPage.$eval('div.right>span>a', el => el.href);
                            maxPage = parseInt(await detailPostPage.$eval('span.count-pageindex', el => el.innerText), 10);
                            await downloadFile(imagePage, detailImage, `${newsId}-${currentPage}.jpg`);

                            console.log('currentPage: "%s", maxPage: "%s", text: "%s", nextPageLink: "%s", detailImage: "%s".', currentPage, maxPage, text, link, detailImage);
                            await delay(3000); //delay 3 seconds to avoid spamming the server
                            currentPage++;
                        } while (currentPage <= maxPage);
                    } catch (error) {
                        console.log('Error when crawling detail page of "%s" at page: "%s"/"%s" with error: "%s"',
                            link, currentPage, maxPage, error);
                    }
                    await insertPost({
                        id: newsId,
                        title: title,
                        date: time,
                        images: JSON.stringify(arrayOfImages),
                        content: content
                    });
                } catch (error) {
                    console.log('Error when crawling post with error: "%s", skipping this post.', error);
                }
            }
            index++;
        } catch (error) {
            console.log('Error when requesting the target url: "%s" with error: "%s"', targetUrl, error);
            break;
        }
    }

    console.log("Cleaning up the puppeteer job...");
    await browser.close();
    closingConnectionPool();
    console.log("Finished the puppeteer job.");
})();
