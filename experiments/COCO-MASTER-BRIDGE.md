# Coco Pass-through Master Bridge v1

仅真机实验；没有新增中文字幕轨道。稳定模块和只读诊断未修改。

## 实现与限制
复用前轮严格购买路径及a/id限定、非目标不改写和不重复桥接原则。本轮不调用旧inject函数。一个独立脚本分别作为UTS响应和虚拟主清单请求入口。
只允许play-edge.itunes.apple.com /WebObjects/MZPlayLocal.woa/hls/playlist.m3u8，a=1307301491，id=1362880914；重复参数拒绝。预告不匹配。
原URL仅存在设备本地persistentStore的Coco.MasterBridge.v1键；桥接地址只有临时标识。30分钟有效，最多64条。过期内容在下次UTS访问清理；关闭模块不会立即擦除本地存储。不要分享Shadowrocket备份。
不捕获UTS Cookie，不转发桥接Cookie/Authorization。仅使用原候选URL的查询授权及Accept头。这可能不足以获取购买版授权；403不是字幕问题，不应通过复制账户Cookie强行补救。
HTTP200且是含variant的HLS主清单才返回；body字符串直接返回，不改换行、不增字幕、不改DRM/Steering/pathway。含相对资源URI则502，避免改变base后播放走错位置。字符串一致已用UTF8 Buffer比对；无法承诺运行时解压/字符解码前的网络字节一致。只报告characters而非伪称网络字节数。
失败统一502纯文本；不返回空HLS，不自动回退或重定向到原地址，因为播放器行为和授权上下文未知。失败可能中断本次播放。
$httpClient.get的真实重定向行为、内部cookie容器、超时单位和跨脚本persistentStore行为需设备确认；没有向它传入账户头。收到的非200回调拒绝；模拟302拒绝不证明真实客户端不自动跟随。
hls-amt是原作者用于本地http-request脚本接管的虚拟路径入口，不代表Apple提供该自定义API。原作者模块为该域名启用MITM；本实验同样只增uts-api及hls-amt。无需URL Rewrite，UTS JSON完成定向改写，GET原站不会命中本实验规则。尚不能验证你当前设备hls-amt证书解密及请求接管成功。

## 参考源码（已核对）
- https://github.com/rexchen1803/apple-video-subtitles/blob/main/payloads/shadowrocket/series/2019-formula-1-drive-to-survive/season-08/uts-redirect.js
- https://github.com/rexchen1803/apple-video-subtitles/blob/main/payloads/shadowrocket/movies/1994-forrest-gump/manifest.js
- https://github.com/rexchen1803/apple-video-subtitles/blob/main/shadowrocket/apple-video-subtitles.module
原作者subscription路径不适用于本购买版；其manifest会注入轨道及解析相对地址，本实验均不执行。

## 测试
node experiments/test-coco-master-bridge.cjs
16项模拟通过：正片、预告、他片、重复参数、订阅路径、循环、其他UTS、原样UTF8 body（含DRM/西语/ap/fa/ak/steering）、网络失败、403、HTML、JSON、302、超时、相对URI、失效句柄。未做真机测试。模块规则采用原作者type=http-request/response,engine=webview形式；未在Shadowrocket解析器内验证。

## iPhone实验
1. 保留稳定字幕模块，关闭其他实验；确认原Coco播放正常。不要启用play-edge MITM，也不要导入原作者整套模块。
2. 复制本目录coco-master-bridge-test.module的Raw链接至Shadowrocket配置-模块，确认脚本下载成功，再启用。
3. 完全退出Apple TV，重新搜索并打开Coco详情，再播放购买版。若没有UTS命中，不说明桥接成功，可能是缓存。
4. 查看[Coco.Bridge]：uts_hit -> uts_result matched及fields -> bridge_hit -> upstream status=200,hls=true,master=true -> returned unchanged=true。fields用对象键顺序的数字路径定位候选，不输出动态键、URL或账号信息。匹配6不是硬编码预期。
5. 仅分享此前缀日志。返回日志不证明客户端实际播放；必须同时连续播放、拖动和切音轨正常，才达到本阶段成功标准。原西语入口仍可显示稳定方案中文，但实验没有新增中文入口。

## 失败回滚
立即关闭此实验模块，完全退出Apple TV后重开，再从搜索进入Coco重新播放。若App缓存桥接地址，退出后重启iPhone再重新进入详情，必要时等待候选30分钟过期并刷新详情；过期本身不会恢复App缓存URL，勿反复启用模块。
保留原稳定模块及已工作MITM设置；不新增play-edge。若仍失败先确认实验已关闭、VPN配置重新加载，重新验证原稳定方案。
missing_or_expired_source提示存储/缓存/有效期；fetch_error或http_status提示网络/授权；relative_uri_requires_rewrite意味着原样要求与资源相对地址冲突。不要在本阶段偷偷改写清单。

## 下一步
先取得脱敏日志确认是否bridge_hit。若有returned但不能播放，检查客户端授权、DRM和实际资源请求；若无bridge_hit，不能推断UTS商品候选就是购买播放器地址。获得第一阶段真机证据后，再评估独立中文轨道。
