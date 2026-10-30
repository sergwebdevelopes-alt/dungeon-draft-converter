# Benchmark results

Appended by `npm run bench` (`BENCH_TARGET=docker` for the Docker image). Each run says how peak memory was measured; older runs without that note are local, process RSS sampled every 100 ms.


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

## 2026-10-29 18:15 UTC, 68579bd

Darwin arm64, Apple M2 Max, Node v24.10.0, map 120×88 squares

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| large.dd2vtt, JPG_70, No grid | 2.7 s | 791 MB | 664 MB | 152.3 MB |
| large.dd2vtt, JPG_140, Grid | 3.8 s | 1611 MB | 1477 MB | 170.5 MB |
| large.dd2vtt, JPG_70 + JPG_140, both | 9.3 s | 2408 MB | 2277 MB | 203.6 MB |
| Lit map, JPG_70, No grid | 0.9 s | 893 MB | 763 MB | 31.1 MB |
| JPG_70, No grid | 5.4 s | 1281 MB | 1150 MB | 22.9 MB |
| JPG_70, Grid | 5.6 s | 1032 MB | 898 MB | 24.5 MB |
| JPG_140, Grid | 6.4 s | 1797 MB | 1663 MB | 39.6 MB |
| JPG_70 + JPG_140, both | 10.2 s | 2739 MB | 2608 MB | 75.3 MB |
| Merge 2 levels, JPG_70, both | 15.7 s | 1327 MB | 1194 MB | 29.5 MB |

## 2026-10-29 18:22 UTC, 68579bd

Docker 29.2.1 linux/arm64, image dungeon-draft-converter (jemalloc), memory limit 4g, map 120×88 squares. Peak memory: process VmHWM

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| large.dd2vtt, JPG_70, No grid | 2.9 s | 1017 MB | 839 MB | 152.3 MB |
| large.dd2vtt, JPG_140, Grid | 4.0 s | 1723 MB | 1549 MB | 170.5 MB |
| large.dd2vtt, JPG_70 + JPG_140, both | 9.6 s | 2890 MB | 2713 MB | 203.6 MB |
| Lit map, JPG_70, No grid | 0.9 s | 1144 MB | 971 MB | 31.1 MB |
| JPG_70, No grid | 5.6 s | 1598 MB | 1422 MB | 22.9 MB |
| JPG_70, Grid | 5.8 s | 1396 MB | 1221 MB | 24.5 MB |
| JPG_140, Grid | 6.6 s | 1930 MB | 1756 MB | 39.6 MB |
| JPG_70 + JPG_140, both | 10.3 s | 2616 MB | 2436 MB | 75.3 MB |
| Merge 2 levels, JPG_70, both | 16.5 s | 1545 MB | 1368 MB | 29.5 MB |

## 2026-10-29 18:54 UTC, 68579bd + uncommitted changes

Docker 29.2.1 linux/arm64, image dungeon-draft-converter (jemalloc), memory limit 4g, map 120×88 squares. Peak memory: process VmHWM

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| large.dd2vtt, JPG_70, No grid | 3.0 s | 1015 MB | 841 MB | 152.3 MB |
| large.dd2vtt, JPG_140, Grid | 4.0 s | 1721 MB | 1546 MB | 170.5 MB |
| large.dd2vtt, JPG_70 + JPG_140, both | 9.5 s | 2589 MB | 2410 MB | 203.6 MB |
| Lit map, JPG_70, No grid | 0.9 s | 1103 MB | 927 MB | 31.1 MB |
| JPG_70, No grid | 5.7 s | 1627 MB | 1455 MB | 22.9 MB |
| JPG_70, Grid | 5.8 s | 1349 MB | 1173 MB | 24.5 MB |
| JPG_140, Grid | 6.6 s | 1950 MB | 1777 MB | 39.6 MB |
| JPG_70 + JPG_140, both | 10.2 s | 2510 MB | 2334 MB | 75.3 MB |
| Merge 2 levels, JPG_70, both | 16.6 s | 1541 MB | 1367 MB | 29.5 MB |

## 2026-10-29 18:56 UTC, 68579bd + uncommitted changes

Docker 29.2.1 linux/arm64, image dungeon-draft-converter (jemalloc), memory limit 4g, env MALLOC_CONF=background_thread:true,dirty_decay_ms:1000,muzzy_decay_ms:0, map 120×88 squares. Peak memory: process VmHWM

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| large.dd2vtt, JPG_70, No grid | 3.0 s | 911 MB | 738 MB | 152.3 MB |
| large.dd2vtt, JPG_140, Grid | 4.0 s | 1656 MB | 1485 MB | 170.5 MB |
| large.dd2vtt, JPG_70 + JPG_140, both | 9.5 s | 2535 MB | 2364 MB | 203.6 MB |
| Lit map, JPG_70, No grid | 0.9 s | 1119 MB | 949 MB | 31.1 MB |
| JPG_70, No grid | 5.6 s | 1425 MB | 1249 MB | 22.9 MB |
| JPG_70, Grid | 5.8 s | 1293 MB | 1124 MB | 24.5 MB |
| JPG_140, Grid | 6.7 s | 1817 MB | 1644 MB | 39.6 MB |
| JPG_70 + JPG_140, both | 10.4 s | 2306 MB | 2131 MB | 75.3 MB |
| Merge 2 levels, JPG_70, both | 16.8 s | 1544 MB | 1366 MB | 29.5 MB |

## 2026-10-29 18:57 UTC, 68579bd + uncommitted changes

Docker 29.2.1 linux/arm64, image dungeon-draft-converter (jemalloc), memory limit 4g, env SHARP_CONCURRENCY=4, map 120×88 squares. Peak memory: process VmHWM

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| large.dd2vtt, JPG_70, No grid | 2.9 s | 811 MB | 639 MB | 152.3 MB |
| large.dd2vtt, JPG_140, Grid | 5.4 s | 1577 MB | 1400 MB | 170.5 MB |
| large.dd2vtt, JPG_70 + JPG_140, both | 12.2 s | 1908 MB | 1736 MB | 203.6 MB |
| Lit map, JPG_70, No grid | 0.9 s | 782 MB | 603 MB | 31.1 MB |
| JPG_70, No grid | 5.5 s | 1117 MB | 943 MB | 22.9 MB |
| JPG_70, Grid | 5.8 s | 1022 MB | 845 MB | 24.5 MB |
| JPG_140, Grid | 7.9 s | 1867 MB | 1689 MB | 39.6 MB |
| JPG_70 + JPG_140, both | 12.5 s | 1956 MB | 1779 MB | 75.3 MB |
| Merge 2 levels, JPG_70, both | 16.1 s | 1051 MB | 878 MB | 29.5 MB |

## 2026-10-29 18:58 UTC, 68579bd + uncommitted changes

Docker 29.2.1 linux/arm64, image dungeon-draft-converter (jemalloc), memory limit 4g, env SHARP_CONCURRENCY=2, map 120×88 squares. Peak memory: process VmHWM

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| large.dd2vtt, JPG_70, No grid | 3.1 s | 706 MB | 531 MB | 152.3 MB |
| large.dd2vtt, JPG_140, Grid | 8.1 s | 1579 MB | 1402 MB | 170.5 MB |
| large.dd2vtt, JPG_70 + JPG_140, both | 17.6 s | 1766 MB | 1592 MB | 203.6 MB |
| Lit map, JPG_70, No grid | 1.0 s | 682 MB | 502 MB | 31.1 MB |
| JPG_70, No grid | 5.9 s | 956 MB | 779 MB | 22.9 MB |
| JPG_70, Grid | 6.4 s | 920 MB | 747 MB | 24.5 MB |
| JPG_140, Grid | 10.5 s | 1777 MB | 1602 MB | 39.6 MB |
| JPG_70 + JPG_140, both | 17.3 s | 1705 MB | 1531 MB | 75.3 MB |
| Merge 2 levels, JPG_70, both | 17.2 s | 907 MB | 731 MB | 29.5 MB |

## 2026-10-29 19:00 UTC, 68579bd + uncommitted changes

Docker 29.2.1 linux/arm64, image dungeon-draft-converter (jemalloc), memory limit 4g, env SHARP_CONCURRENCY=4 MALLOC_CONF=background_thread:true,dirty_decay_ms:1000,muzzy_decay_ms:0, map 120×88 squares. Peak memory: process VmHWM

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| large.dd2vtt, JPG_70, No grid | 2.8 s | 745 MB | 576 MB | 152.3 MB |
| large.dd2vtt, JPG_140, Grid | 5.3 s | 1518 MB | 1346 MB | 170.5 MB |
| large.dd2vtt, JPG_70 + JPG_140, both | 11.8 s | 1755 MB | 1584 MB | 203.6 MB |
| Lit map, JPG_70, No grid | 0.9 s | 760 MB | 591 MB | 31.1 MB |
| JPG_70, No grid | 5.4 s | 970 MB | 801 MB | 22.9 MB |
| JPG_70, Grid | 5.6 s | 927 MB | 753 MB | 24.5 MB |
| JPG_140, Grid | 7.7 s | 1698 MB | 1530 MB | 39.6 MB |
| JPG_70 + JPG_140, both | 12.1 s | 1746 MB | 1573 MB | 75.3 MB |
| Merge 2 levels, JPG_70, both | 15.9 s | 979 MB | 807 MB | 29.5 MB |

## 2026-10-30 09:16 UTC, 01e5d5e + uncommitted changes

Docker 29.2.1 linux/arm64, image dungeon-draft-converter (jemalloc), memory limit 4g, env MAX_PARALLEL_IMAGES=4, maps Bench_120x88 120×88, Bench_120x88_upper 120×88, Bench_120x88_lit 120×88, Bench_60x44 60×44 squares. Peak memory: process VmHWM

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| Unlit 60×44, all presets, both | 8.2 s | 3577 MB | 3403 MB | 62.7 MB |

## 2026-10-30 09:16 UTC, 01e5d5e + uncommitted changes

Docker 29.2.1 linux/arm64, image dungeon-draft-converter (jemalloc), memory limit 4g, env MAX_PARALLEL_IMAGES=2, maps Bench_120x88 120×88, Bench_120x88_upper 120×88, Bench_120x88_lit 120×88, Bench_60x44 60×44 squares. Peak memory: process VmHWM

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| Unlit 60×44, all presets, both | 8.0 s | 3158 MB | 2982 MB | 62.7 MB |

## 2026-10-30 09:17 UTC, 01e5d5e + uncommitted changes

Docker 29.2.1 linux/arm64, image dungeon-draft-converter (jemalloc), memory limit 4g, env MAX_PARALLEL_IMAGES=1, maps Bench_120x88 120×88, Bench_120x88_upper 120×88, Bench_120x88_lit 120×88, Bench_60x44 60×44 squares. Peak memory: process VmHWM

| Case | Time | Peak memory | Added by request | Zip |
|---|---|---|---|---|
| Unlit 60×44, all presets, both | 9.5 s | 2635 MB | 2461 MB | 62.7 MB |
