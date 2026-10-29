# Benchmark results

Appended by `npm run bench`. Peak memory is the server process RSS, sampled every 100 ms.


## 2026-10-29 16:37 UTC, 2bd520e

Darwin arm64, Apple M2 Max, Node v24.10.0, map 120×88 squares

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| Lit map, JPG_70, No grid | 1.0 s | 1037 MB | 902 MB | 31.1 MB |
| JPG_70, No grid | 5.3 s | 1298 MB | 1171 MB | 22.9 MB |
| JPG_70, Grid | 6.2 s | 1129 MB | 997 MB | 24.5 MB |
| JPG_140, Grid | 8.7 s | 2085 MB | 1958 MB | 39.6 MB |
| JPG_70 + JPG_140, both | 13.5 s | 2808 MB | 2677 MB | 75.3 MB |
| Merge 2 levels, JPG_70, both | 16.2 s | 1629 MB | 1493 MB | 29.5 MB |

## 2026-10-29 16:46 UTC, 2bd520e

Darwin arm64, Apple M2 Max, Node v24.10.0, map 120×88 squares

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| large.dd2vtt, JPG_70, No grid | 2.7 s | 1160 MB | 1049 MB | 152.3 MB |
| large.dd2vtt, JPG_140, Grid | 6.4 s | 2357 MB | 2223 MB | 170.5 MB |
| large.dd2vtt, JPG_70 + JPG_140, both | 13.5 s | 2942 MB | 2805 MB | 203.6 MB |

## 2026-10-29 17:07 UTC, 2bd520e + uncommitted changes

Darwin arm64, Apple M2 Max, Node v24.10.0, map 120×88 squares

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| large.dd2vtt, JPG_70, No grid | 8.6 s | 948 MB | 824 MB | 152.3 MB |
| large.dd2vtt, JPG_140, Grid | 18.3 s | 1247 MB | 1119 MB | 170.5 MB |
| large.dd2vtt, JPG_70 + JPG_140, both | 39.4 s | 1784 MB | 1657 MB | 203.6 MB |
| Lit map, JPG_70, No grid | 3.5 s | 974 MB | 846 MB | 31.1 MB |
| JPG_70, No grid | 16.5 s | 1242 MB | 1117 MB | 22.9 MB |
| JPG_70, Grid | 19.5 s | 888 MB | 763 MB | 24.5 MB |
| JPG_140, Grid | 27.5 s | 1683 MB | 1553 MB | 39.6 MB |
| JPG_70 + JPG_140, both | 49.0 s | 1734 MB | 1608 MB | 75.3 MB |
| Merge 2 levels, JPG_70, both | 52.4 s | 1371 MB | 1242 MB | 29.5 MB |

Note: times in this run are not comparable (Dungeondraft was running, load average 7). Memory is still valid.

## 2026-10-29 17:26 UTC, 2bd520e + uncommitted changes

Darwin arm64, Apple M2 Max, Node v24.10.0, map 120×88 squares

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| large.dd2vtt, JPG_70, No grid | 10.6 s | 1172 MB | 1044 MB | 152.3 MB |
| large.dd2vtt, JPG_140, Grid | 21.9 s | 1975 MB | 1847 MB | 170.5 MB |
| large.dd2vtt, JPG_70 + JPG_140, both | 53.0 s | 2229 MB | 2102 MB | 203.6 MB |
| Lit map, JPG_70, No grid | 4.9 s | 891 MB | 763 MB | 31.1 MB |
| JPG_70, No grid | 22.1 s | 1136 MB | 1010 MB | 22.9 MB |
| JPG_70, Grid | 23.4 s | 880 MB | 751 MB | 24.5 MB |
| JPG_140, Grid | 33.7 s | 1836 MB | 1708 MB | 39.6 MB |
| JPG_70 + JPG_140, both | 62.8 s | 2315 MB | 2186 MB | 75.3 MB |
| Merge 2 levels, JPG_70, both | 71.2 s | 1434 MB | 1306 MB | 29.5 MB |
