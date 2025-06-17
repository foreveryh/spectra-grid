# 项目待办事项

## 高优先级 (MVP 发布前)
- [x] R2 / D1 增量流水线脚本
  - [x] `import.ts` 生成缩略图 + photos.json
  - [x] `upload-r2.ts` 跳过已存在对象
  - [x] `sync-d1.ts` 本地 & 远程写入
- [ ] 前端切换统一数据源
  - [ ] `/api/photos` → Grid 组件（生产）
  - [ ] 详情页从 D1 拉取 palette / metadata
- [ ] 软删除流程
  - [x] `POST /api/photo/[id]/delete` / `restore`
  - [ ] 网格 & 详情页提供删除 / 恢复按钮（仅 dev/admin）
- [ ] 错误 & 加载状态
  - [ ] 图片加载失败占位
  - [ ] 懒加载 skeleton / spinner
- [ ] SEO / Meta
  - [ ] og:image 生成、标题、描述

## 中优先级 (优化 & 自动化)
- [ ] 夜间清理脚本 CI
  - [x] `purge-deleted.ts` 删除 R2 对象 + 更新 purged
  - [ ] GitHub Action sched 0 4 * * * 触发
- [ ] 图片压缩/多尺寸
  - [ ] 生成 480px `@2x` AVIF & WebP，`srcSet` 响应式
- [ ] 上传脚本并发 & 进度
  - [ ] `--concurrency` 参数（默认为 CPU core）
  - [ ] CLI 进度条
- [ ] 数据流文档 (docs/data-flow.md)
  - [ ] ER 图 + 时序图
  - [ ] API 合约 (OpenAPI?)

## 低优先级 (质量保障)
- [ ] 测试
  - [ ] 前端组件单测 (Vitest + Testing Library)
  - [ ] 脚本 e2e (Bun test)
- [ ] 性能监控
  - [ ] Lighthouse CI budget
  - [ ] Cloudflare Analytics 集成
- [ ] 文档
  - [x] R2 & D1 Setup Guides
  - [ ] 开发者贡献指南 (CONTRIBUTING.md)
  - [ ] 完整 API Reference 