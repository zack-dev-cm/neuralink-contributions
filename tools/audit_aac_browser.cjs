/* Component-method audit of real upstream code. This is not a user trial. */
const fs = require('fs');
const path = require('path');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [browserName = 'chromium', revision = 'development'] = process.argv.slice(2);

(async () => {
  const browser = await playwright[browserName].launch({headless: true,
    ...(browserName === 'chromium' ? {executablePath: '/usr/bin/google-chrome'} : {})});
  try {
    const context = await browser.newContext();
    // Only local authored fixtures and the selected checkout may be loaded.
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
      ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || String(error)));
    await page.goto(`http://127.0.0.1:18872/aac-audit/${revision}/`, {waitUntil: 'load'});
    await page.waitForFunction(() => !!window.AAC_AUDIT);
    await page.evaluate(() => window.AAC_AUDIT_READY);
    const evaluate = async () => page.evaluate(async () => {
      const {SearchModal, GridView, gridUtil, GridData, GridElement, MetaData, localStorageService} = window.AAC_AUDIT;
      const elem = (id, level, hidden = false) => new GridElement({id, label:{en:'audit '+id},
        vocabularyLevel:level, hidden, actions:[], x:0, y:0});
      const data = [elem('eight',8), elem('ten',10), elem('unlevelled',null), elem('manual',8,true)];
      data.forEach((e,i) => { e.x = i; });
      const grid = new GridData({id:'audit-home', label:{en:'Audit home'}, gridElements:data,
        minColumnCount:4, rowCount:1, showGlobalGrid:false});
      const initial = JSON.stringify(grid);
      const results = [];
      for (const [name, level, toggle] of [['level-8',8,null],['level-10',10,null],['unrestricted',null,null],['local-toggle-8',10,8]]) {
        localStorageService.remove(localStorageService.KEY_CURRENT_TOGGLE_LEVEL);
        if (toggle !== null) localStorageService.saveJSON(localStorageService.KEY_CURRENT_TOGGLE_LEVEL,toggle);
        const renderer = Object.assign(GridView.data(), {metadata:new MetaData({vocabularyLevel:level}),
          globalGridData:null});
        const copied = new GridData(JSON.parse(initial));
        await GridView.methods.recalculateRenderGrid.call(renderer,copied);
        const search = Object.assign(SearchModal.data(), SearchModal.methods, {
          grids:[new GridData(JSON.parse(initial))], searchTerm:'audit', homeGridId:grid.id,
          $forceUpdate:()=>{}, initPromise:Promise.resolve()
        });
        search.graphList = gridUtil.getGraphList(search.grids);
        await search.search(true);
        const visible = renderer.renderGridData.gridElements.map(e=>e.id).sort();
        const found = search.results.map(r=>r.elem.id).sort();
        results.push({name,visible,found,unavailableResults:found.filter(id=>!visible.includes(id))});
      }
      localStorageService.remove(localStorageService.KEY_CURRENT_TOGGLE_LEVEL);
      if (JSON.stringify(grid) !== initial) throw new Error('Fixture was mutated');
      // This audit documents the observed defect instead of treating it as a pass.
      if (results[0].visible.join(',') !== 'eight') throw new Error('Unexpected rendering semantics; reassess fixture');
      if (!results[0].unavailableResults.includes('ten')) throw new Error('Expected residual gap absent; reassess route');
      return {scope:'real upstream component methods; no full-app keyboard, speech, or collaborator validation',
        defect_reproduced:true, fixture_unchanged:true, results};
    });
    const online = await evaluate();
    await context.setOffline(true);
    const offline = await evaluate();
    const record = {browser:browserName,version:browser.version(),revision,pageErrors:errors,online,offline,
      recorded_at:new Date().toISOString()};
    if(errors.length) throw new Error(JSON.stringify(errors));
    const dest=path.resolve(__dirname, `../evidence/A-02/${revision}-${browserName}.json`);
    fs.writeFileSync(dest,JSON.stringify(record,null,2)+'\n');
    console.log(JSON.stringify(record,null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
