// Cloudflare Pages Function - Projects API
// 使用 Cache API 做持久化存储（如果可用），回退到全局变量

const CACHE_KEY = 'projects-data-cache-v1';
const DEFAULT_PROJECTS = {
  "projects": [
    {
      "id": "ds01",
      "name": "设计系统重构",
      "type": "设计项目",
      "year": "2025",
      "thumb": "assets/images/projects/fmimg/ds01.png",
      "visible": true,
      "title": "设计系统重构",
      "subtitle": "为下一代数字产品构建可扩展的设计语言",
      "date": "2025年3月",
      "description": "这是一个关于设计系统重构的项目案例。\n\n面对产品矩阵扩张带来的体验碎片化问题，我们重新梳理了底层设计语言，建立了一套基于 Token 的主题体系，覆盖颜色、间距、字号、动效等核心维度。\n\n通过组件库的标准化与文档化，设计与研发的协作效率提升了 40%，新功能上线的视觉一致性显著提高。",
      "images": ["assets/images/projects/fmimg/ds01.png"]
    },
    {
      "id": "inspire-mono",
      "name": "Inspire Mono",
      "type": "Coding 项目",
      "year": "2025",
      "thumb": "assets/images/projects/fmimg/inspire_mono_01.png",
      "visible": true,
      "title": "Inspire Mono",
      "subtitle": "面向设计师的灵感聚合与检索工具",
      "date": "2025年1月",
      "description": "Inspire Mono 是一款为设计师打造的本地化灵感检索工具。\n\n它支持从本地素材库中快速检索图片、配色与版式参考，并通过轻量的标签系统实现智能归类。所有数据均存储在本地，无需联网即可使用。\n\n项目采用纯前端方案实现，注重启动速度与交互流畅度，平均检索响应在 50ms 以内。",
      "images": ["assets/images/projects/fmimg/inspire_mono_01.png"]
    },
    {
      "id": "wasm-tool",
      "name": "WASM 设计工具",
      "type": "设计工具",
      "year": "2024",
      "thumb": "assets/images/projects/fmimg/wasm01.png",
      "visible": true,
      "title": "WASM 设计工具",
      "subtitle": "基于 WebAssembly 的高性能设计工具探索",
      "date": "2024年9月",
      "description": "这是一次基于 WebAssembly 探索浏览器端高性能设计工具的尝试。\n\n通过将核心计算逻辑用 Rust 编写并编译为 WASM，工具在处理大规模图形运算时仍能保持流畅的交互体验，突破了传统 Web 应用的性能瓶颈。\n\n项目同时探索了跨端共享渲染管线的可能性，为后续产品设计提供了技术储备。",
      "images": ["assets/images/projects/fmimg/wasm01.png"]
    },
    {
      "id": "wasm-flow",
      "name": "WASM Flow",
      "type": "设计项目",
      "year": "2024",
      "thumb": "assets/images/projects/fmimg/wasm02.png",
      "visible": true,
      "title": "WASM Flow",
      "subtitle": "面向动效编排的可视化工作流",
      "date": "2024年5月",
      "description": "WASM Flow 是一套面向动效设计师的可视化工作流系统。\n\n设计师可以通过节点连线的方式编排复杂的动效逻辑，实时预览效果并导出可复用的代码片段。系统底层借助 WASM 实现高性能运算，保证复杂场景下的编辑流畅度。\n\n该工具已在内部团队投入使用，显著降低了动效设计与开发之间的沟通成本。",
      "images": ["assets/images/projects/fmimg/wasm02.png"]
    }
  ]
};

// 内存存储（同一会话内有效）
let memoryCache = null;

export async function onRequest(context) {
  const { request } = context;
  const method = request.method;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (method === 'GET') {
    try {
      // 1. 检查内存缓存（同一会话）
      if (memoryCache) {
        return new Response(JSON.stringify(memoryCache), { headers: corsHeaders });
      }

      // 2. 尝试 Cache API
      try {
        const cache = caches.default;
        const req = new Request('https://cache.local/' + CACHE_KEY);
        const resp = await cache.match(req);
        if (resp) {
          const text = await resp.text();
          if (text) {
            const data = JSON.parse(text);
            memoryCache = data;
            return new Response(JSON.stringify(data), { headers: corsHeaders });
          }
        }
      } catch (e) {
        // Cache API 不可用，继续回退
      }

      // 3. 尝试 KV（如果绑定了）
      try {
        if (context.env && context.env.PROJECTS_KV) {
          const raw = await context.env.PROJECTS_KV.get('projects_data');
          if (raw) {
            const data = JSON.parse(raw);
            memoryCache = data;
            // 写入 Cache API 供后续使用
            try {
              const cache = caches.default;
              const req = new Request('https://cache.local/' + CACHE_KEY);
              const cacheResp = new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=31536000' },
              });
              await cache.put(req, cacheResp);
            } catch (e2) {}
            return new Response(JSON.stringify(data), { headers: corsHeaders });
          }
        }
      } catch (e) {}

      // 4. 返回默认数据
      memoryCache = DEFAULT_PROJECTS;
      return new Response(JSON.stringify(DEFAULT_PROJECTS), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify(DEFAULT_PROJECTS), { headers: corsHeaders });
    }
  }

  if (method === 'POST') {
    try {
      const body = await request.text();
      const data = JSON.parse(body);

      // 1. 写入内存
      memoryCache = data;

      // 2. 尝试写入 Cache API
      try {
        const cache = caches.default;
        const req = new Request('https://cache.local/' + CACHE_KEY);
        const resp = new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=31536000' },
        });
        await cache.put(req, resp);
      } catch (e) {}

      // 3. 尝试写入 KV
      try {
        if (context.env && context.env.PROJECTS_KV) {
          await context.env.PROJECTS_KV.put('projects_data', JSON.stringify(data));
        }
      } catch (e) {}

      return new Response(JSON.stringify({
        success: true,
        count: (data.projects || []).length,
        cache: memoryCache !== null,
        memoryOnly: !(context.env && context.env.PROJECTS_KV)
      }), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: e.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
}
