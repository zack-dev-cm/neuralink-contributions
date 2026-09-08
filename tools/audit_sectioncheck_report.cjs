// Inspect a self-contained local report in a fresh browser context, offline.
const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [report, output] = process.argv.slice(2).map(p => path.resolve(p));

(async () => {
  fs.mkdirSync(output); // Preserve prior evidence by requiring a new directory.
  const browser = await playwright.chromium.launch({headless:true, executablePath:'/usr/bin/google-chrome'});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000},offline:true});
    const page = await context.newPage();
    const errors=[], requests=[];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    await page.goto(pathToFileURL(report).href);
    const inspect = () => page.evaluate(() => ({
      title:document.title,
      images:[...document.images].map(im => ({complete:im.complete,width:im.naturalWidth,height:im.naturalHeight})),
      overflow:document.documentElement.scrollWidth > innerWidth,
      hasDecisionBoundary:document.body.innerText.includes('No decision is recorded by this report'),
      hasRoiBoundaries:document.body.innerText.includes('Proposed target ROI boundaries'),
      hasReviewFingerprint:document.body.innerText.includes('Review fingerprint:'),
    }));
    const desktop=await inspect();
    await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    const narrow=await inspect();
    await page.screenshot({path:path.join(output,'narrow.png'),fullPage:true});
    const result={browser:browser.version(),transport:'file URL',offline:true,errors,remoteRequests:requests,desktop,narrow};
    fs.writeFileSync(path.join(output,'browser.json'),JSON.stringify(result,null,2)+'\n');
    for (const check of [desktop,narrow]) {
      if(check.overflow || check.images.length!==6 || check.images.some(im => !im.complete || im.width===0)
        || !check.hasDecisionBoundary || !check.hasRoiBoundaries || !check.hasReviewFingerprint) throw Error('Report check failed');
    }
    if(errors.length || requests.length) throw Error('Report has client errors or remote requests');
    console.log(JSON.stringify(result,null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
