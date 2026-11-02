# 个人影视中文字幕

统一 Shadowrocket 模块（导入一次，新增电影后刷新模块）：

https://raw.githubusercontent.com/joyharry-cmd/subtitles/main/shadowrocket/subtitles.module

现有 et_itunes_zh.module 和 et_itunes_zh.js 入口保持不变。请避免同时启用旧 E.T. 模块及总模块中的重复规则。

- movies/：每部电影的配置、播放列表和适配信息。E.T. 使用 legacy 配置引用原脚本，未复制或重新生成字幕。
- tools/build.py：Python 3.11+ 离线 SRT/WebVTT/HLS 编译器，无第三方依赖。
- examples/movie.json：配置模板。
- tests/ 与 GitHub Actions：解析、错误资源、时间映射、边界、授权声明等验证；根目录 verify.cjs 保留 E.T. 96 段模拟测试。
- [新增电影标准流程](docs/新增电影.md)：需要抓取的请求、脱敏要求、构建和实测步骤。

运行 `python tools/build.py`、`python -m unittest discover -s tests` 和 `node verify.cjs`。常规构建支持连续同映射 V2-N 字幕及末尾 empty；多映射、内部 discontinuity 和非零偏移会拒绝，需要专门适配。自动构建不会自动获得版权许可。

未经明确许可不添加第三方完整字幕。E.T. 当前沿用用户指定的公开测试状态，但未确认原项目再分发许可；publish_authorized=false，严格 `--publish` 检查会阻止整库重新发布。公开前需人工审核权利证据。CI 不自动上传字幕，不向设备自动推送更新。

未进行 iPhone/iPad/Shadowrocket 真机测试，不能保证版本一致及整片同步。


## 星际穿越（2014）iTunes

统一模块现已包含 Interstellar 法语字幕替换规则，匹配 P1220541004_A960891136。字幕及处理脚本来自 [rexchen1803/apple-video-subtitles](https://github.com/rexchen1803/apple-video-subtitles)，直接引用原作者固定提交 9e7aa43bd9e1a4032d4bc780c353f8f4a6ef31bb，不复制或重新托管完整字幕。规则参数和匹配表达式原样保留；三个 MITM 域名与 E.T. 相同。配置见 movies/interstellar-itunes/config.json。

在 Shadowrocket 刷新统一模块并确认两条脚本下载成功，在线播放对应 iTunes 版本，选择法语。原 E.T. 链接与脚本保持不变。新增回归检查覆盖资源隔离、语言和主机排除及模块合并；未进行 iPhone/iPad 真机播放测试。
