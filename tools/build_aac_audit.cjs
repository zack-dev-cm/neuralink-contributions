const path = require('path');
const fs = require('fs');
const [checkout, output] = process.argv.slice(2).map(p => path.resolve(p));
const webpack = require(path.join(checkout, 'node_modules/webpack'));
const config = require(path.join(checkout, 'webpack.config.js'))({});
config.context = checkout;
config.entry = path.resolve(__dirname, '../aac-audit/entry.js');
config.output.path = output;
config.output.publicPath = './';
config.output.filename = 'audit.js';
config.devtool = false;
config.resolve.alias.upstream = checkout;
config.resolveLoader = {modules: [path.join(checkout, 'node_modules')]};
delete config.devServer;
webpack(config, (err, stats) => {
  if (err) { console.error(err); process.exitCode = 1; return; }
  console.log(stats.toString({all:false, errors:true, warnings:true, timings:true}));
  if (stats.hasErrors()) { process.exitCode = 1; return; }
  const appLink = path.join(output, 'app');
  if (!fs.existsSync(appLink)) fs.symlinkSync(path.join(checkout,'app'),appLink,'dir');
  fs.writeFileSync(path.join(output,'index.html'), `<!doctype html><html><head><meta charset="utf-8"><title>AAC source fixture audit</title></head><body><h1>AAC source fixture audit</h1><p>Synthetic component-method checks only; no collaborator or delivery evidence.</p>
  ${['jquery.min.js','jquery-ui.min.js','jquery.contextMenu.min.js','object-model.min.js','pouchdb-8.0.1.min.js','loglevel.min.js','sjcl.min.js'].map(name=>`<script src="/${path.basename(checkout)}/app/lib/${name}"></script>`).join('\n')}
  <script src="./audit.js"></script></body></html>`);
});
