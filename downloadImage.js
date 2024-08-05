const fs= require('fs');

async function downloadFile(page, url, imageName) {
    try {
        const response = await page.goto(url, {timeout: 180000, waitUntil: 'networkidle0'})
        const imageBuffer = await response.buffer()
        await fs.promises.writeFile(`./public/${imageName}`, imageBuffer)
        console.log(`Image: ${imageName} downloaded successfully.`);
    } catch (error) {
        console.error('Error when downloading the image with error: "%s".', error);
    }
}

module.exports = {
    downloadFile
}