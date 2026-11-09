# Vendored libraries

Kept in the repository so the site works offline and never depends on a third-party CDN at runtime.

| File | Library | Version | License |
|---|---|---|---|
| `astronomy-engine-2.1.19.min.js` | [Astronomy Engine](https://github.com/cosinekitty/astronomy) by Don Cross | 2.1.19 | MIT (header inside the file) |
| `lightweight-charts-4.2.3.standalone.production.js` | [Lightweight Charts](https://github.com/tradingview/lightweight-charts) by TradingView | 4.2.3 | Apache-2.0 (`LICENSE-lightweight-charts.txt`); the TradingView logo on the chart is the required attribution |

Both match the npm packages pinned in `package.json`, which the test suite uses.
