# 项目回顾

_最后更新：2025-06-17_

## 1. 背景与目标
Spectra Grid 起源于"用 Cloudflare 全家桶复刻 **Thiings** 色相渐变无限照片墙"的一次快速黑客实验。MVP 目标：

1. 在桌面与移动端以 60 fps 呈现约 1,000 张照片的可拖拽网格。
2. 完全运行于 Cloudflare Pages + Functions，无需自管服务器；原图与缩略图存 R2，元数据存 D1。
3. 保证离线开发体验——本地直接读取静态 `photos.json`。

验收标准：Edge 命中缓存首屏 < 1 s，本地管线 < 30 s 导入 1,000 张图片。

---
## 2. 关键技术决策
| 模块 | 决策 | 理由 |
|------|------|------|
| 运行时 | **Next.js 14 `app/` + Bun** | React 18 + Edge Server Components；Bun 提供极速 TS/ESM 与脚本统一运行时。|
| 部署 | **next-on-pages** + `wrangler pages deploy` | 规避 Cloudflare Pages 25 MiB 单文件限制，最终函数 < 1 MiB。|
| 图片处理 | 本地 **sharp** CLI | 免付费 Image Resizing，确定性 AVIF 缩略图。|
| 颜色分析 | **colorthief**（可选 exifreader） | 纯 JS，无需 Python/OpenCV。|
| 数据 | **R2**（资源）+ **D1**（元数据） | 官方托管，无外部 DB。|
| 认证/支付 | 计划集成 **Rownd** | 零密码登录 + 订阅支付，省去合规与维护。|

---
## 3. 主要挑战与解决方案
1. **高性能网格交互**  
   需要实现色相排序、惯性滚动，同时保持 URL 状态和点击跳转。**方案：** 事件节流 + CSS `will-change` + Next 预取详情页。

2. **端到端资源管线**  
   一条命令完成本地导入、AVIF 缩略图生成、颜色计算、上传 R2、同步 D1。**方案：** 三个 Bun 脚本 (`import` → `upload-r2` → `sync-d1`)，使用哈希命名与幂等逻辑。

3. **首次使用 R2 & D1**  
   碰到 R2 无 `head/list`、D1 远程禁用事务等限制。**方案：** R2 采用"尝试上传 + 捕获 412"跳过重复；同步脚本在远程模式自动去掉事务。

4. **Cloudflare Pages 部署限制**  
   Edge Bundle 超 25 MiB 及 Node 内置兼容问题。**方案：** 改用 next-on-pages 并开启 `nodejs_compat`。Edge 函数总大小降至 740 KiB。

---
## 4. 已取得成果
* 网格与详情页在 M2 / iPhone 13 上均达到 60 fps。
* **导入→上传→同步→部署** 全流程脚本自动化。
* Edge 函数从 26.9 MiB 缩至 740 KiB（11 个模块）。
* README 与文档目录重构，英/中文双语模板完备。

---
## 5. 待改进 / 风险
* **数据源统一** – 开发环境仍用静态 JSON，需要统一到 `/api/photos`。
* **软删除 UI** – API 已就绪，但缺少前端按钮与即时刷新。
* **大批量上传性能** – `sharp` CPU 密集，计划加入并发参数与进度条。
* **自动化测试** – 尚无单测 / e2e；计划使用 Vitest / Bun test。
* **依赖升级** – Next 15、Bun 稳定版发布后可能需适配。

---
## 6. 下一步计划（未来 1-2 周）
1. **接入 Rownd 完成认证与支付**  
   - 为高分辨率下载加登录门槛。
   - 利用 Rownd 托管隐私条款、T&C 与付款合规。
2. **隐私及法律页面** – 通过 Rownd 或静态 Markdown 自动生成。
3. **API 整合** – 上线 `/api/photos` Edge Function，前端迁移。
4. **软删除 UI 完善** – 管理员删除/恢复按钮 + 乐观更新。
5. **可观测性** – 集成 Lighthouse CI 预算与 Cloudflare Analytics。 