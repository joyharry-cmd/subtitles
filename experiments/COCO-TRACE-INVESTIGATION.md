# Coco 未触发桥接调查
证据范围：用户本次粘贴的uts_hit/uts_result matched=6、播放正常、play-edge:443连接，以及GitHub源码。未取得新的完整真机日志，未读取或公开私人响应。

最可能是实际播放未消费这次详情候选（另一个UTS入口、购买授权API或缓存均可能），但未证实。play-edge连接只能证明域名连接，不能证明具体请求是主清单。

状态表：
- 详情候选改写代码分支运行：用户日志已证实；客户端实际收到/采纳未验证。
- 详情只供展示、购买版另API、缓存、重新构造URL：均尚未验证。
- 序列化或Content-Encoding/Content-Length兼容：尚未验证，旧脚本仅$done({body})依赖运行时处理头。
- 桥接请求已发但未匹配/未加载：尚未验证，自检用于隔离。
- 存储过期/获取授权失败导致完全无bridge_hit：按固定源码控制流排除，这些操作均在bridge_hit之后。
- 旧版缓存：尚未验证。用户贴的uts_result无fields，固定源码应输出fields；若日志未经裁剪值得核对，不能据此断言缓存。

原作者：模块监听整个uts/(v1|v2|v3)/，不是单个movies。当前模块固定08afb047c1fd259451cac81920d9d9a6fe7792ce的UTS脚本与读取时main相同。专用subscription候选改到hls-amt虚拟入口；未命中特定桥接的hlsUrl改成play-cdn/play-edge-cdn，模块再用header规则将相应请求重写回原域名。可以确认配置存在这两条分支，不能从源码证明Apple实际选择哪个UTS接口，或证明header规则解决购买版证书/授权。原作者支持若干Apple影片资源；不能仅凭路径推断它们全是Apple TV+自制内容。

旧桥接审查：
1 严格主机/购买路径/唯一参数a,id，排除预告；只监听详情明显窄于原作者。
2 匹配后序列化JSON，日志在$done之前，不是客户端接收回执。
3 persistentStore要求write返回true，状态64条30分钟。并发写可能丢记录；过期不物理自动清除；均应产生bridge_hit后的失败。
4 标识符合模块[a-z0-9-]+规则；bridge_hit在读存储前；脚本下载/解密/规则冲突仍是外部未知。
5 GET只有候选URL无购买会话头，授权未验证；超时/非200/非HLS/相对URI均失败，可能中断播放。returned日志也只在$done调用前，不证明播放器接收。
6 未修改响应头只返回body、没有版本标识；无法仅凭现有日志排除缓存或客户端丢弃。
7 当前没有证据支持添加中文轨道。

新实验：
关闭旧桥接和旧只读诊断，保留稳定字幕；导入coco-playback-trace-v1.module，确认固定脚本下载成功。
Safari打开 https://hls-amt.itunes.apple.com/__coco_trace_v1/health ，必须显示coco-trace-20261104-r1且日志health_hit。只生成静态文本，不抓播放地址。失败优先排查hls-amt解密/脚本下载/规则，勿启用play-edge MITM。自检成功仅证明Safari请求可接管，不能保证Apple TV请求相同。
完全退出Apple TV，先打开详情停留20秒，记A时刻；点击播放记B；播放30秒后记C。只分享[Coco.Trace]行及A/B/C相对时间。日志有版本、API大类、json/encoding、候选数量和数字字段位置；没有任何完整URL或动态对象键。
同时在Shadowrocket现有连接列表手工记录A/B窗口各域名是否出现/连接次数（uts-api/play/play-edge/cma/cma2/amp-api.videos），不启用新域名MITM、不分享完整请求、IP或账号头。TLS连接复用意味着没有新连接不能排除新请求。其他域名目前都只是待调查对象，无证据指认真实入口。
只读脚本$done({})不修改body，因此本轮不能证明旧改写JSON已被客户端采纳；需要未来经单独授权的客户端可见标记实验或脱敏客户端响应证据。不能从服务端脚本日志伪造这种证明。
关闭新模块即可回滚，无播放地址改写和持久状态。若仍见旧Coco.Bridge日志说明旧模块未关闭或规则重叠。

5项模拟检查仅检查只读/脱敏/自检/完成一次，不当作播放链路证据。真正入口仍未定位。下一步根据B阶段UTS响应及自检结果决定；若无UTS变化，再研究实际出现的域名，逐个低风险评估，不能广泛MITM。
