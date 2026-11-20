# 个人影视中文字幕

统一 Shadowrocket 模块（导入一次，新增电影后刷新模块）：

https://raw.githubusercontent.com/joyharry-cmd/subtitles/main/shadowrocket/subtitles.module

E.T. 通过统一模块管理，旧独立安装模块已移除。movies/iTunes-Movie-1982-E.T.-the-Extra-Terrestrial/e.t.-the-extra-terrestrial_zh.js 保留，供统一模块及自动化验证使用。

- movies/：每部电影的配置、播放列表和适配信息。E.T. 使用 legacy 配置引用原脚本，未复制或重新生成字幕。
- tools/build.py：Python 3.11+ 离线 SRT/WebVTT/HLS 编译器，无第三方依赖。
- examples/movie.json：配置模板。
- tests/ 与 GitHub Actions：解析、错误资源、时间映射、边界、授权声明等验证；根目录 tests/verify_et.cjs 保留 E.T. 96 段模拟测试。
- [新增电影标准流程](docs/新增电影.md)：需要抓取的请求、脱敏要求、构建和实测步骤。

运行 `python tools/build.py`、`python -m unittest discover -s tests` 和 `node tests/verify_et.cjs`。常规构建支持连续同映射 V2-N 字幕及末尾 empty；多映射、内部 discontinuity 和非零偏移会拒绝，需要专门适配。自动构建不会自动获得版权许可。

未经明确许可不添加第三方完整字幕。E.T. 当前沿用用户指定的公开测试状态，但未确认原项目再分发许可；publish_authorized=false，严格 `--publish` 检查会阻止整库重新发布。公开前需人工审核权利证据。CI 不自动上传字幕，不向设备自动推送更新。

未进行 iPhone/iPad/Shadowrocket 真机测试，不能保证版本一致及整片同步。


## 星际穿越（2014）iTunes

统一模块现已包含 Interstellar 法语字幕替换规则，匹配 P1220541004_A960891136。字幕及处理脚本来自 [rexchen1803/apple-video-subtitles](https://github.com/rexchen1803/apple-video-subtitles)，经用户确认取得公开再分发授权后，将原作者固定提交 9e7aa43bd9e1a4032d4bc780c353f8f4a6ef31bb 的脚本原样保存于本项目电影目录，并使用本仓库固定提交地址。原作者署名和字幕内容保持不变。规则参数和匹配表达式原样保留；三个 MITM 域名与 E.T. 相同。配置见 movies/iTunes-Movie-2014-Interstellar/config.json。

在 Shadowrocket 刷新统一模块并确认两条脚本下载成功，在线播放对应 iTunes 版本，选择法语。原 E.T. 链接与脚本保持不变。新增回归检查覆盖资源隔离、语言和主机排除及模块合并；未进行 iPhone/iPad 真机播放测试。


## Toy Story 5（2026）iTunes

es-419 V2 → 简体中文，共 94 段，仅匹配已捕获 AP CDN 的完整资源路径。原文件逐字节内嵌，无运行时网络请求，无二次时间轴变更；Apple TV 真机验证待完成。选择拉美西班牙语字幕使用。


### Subtitle CDN compatibility

All seven movie adapters match `vod-(?:ap|fa|ak)-amt.tv.apple.com` in both module rules and script URL validation. Asset, language, version and segment constraints remain unchanged. The unnamed adapter normalizes only these three exact hosts for its embedded lookup. `python -m unittest discover -s tests` includes all-segment CDN equivalence checks. FA/AK playback still requires device verification.
