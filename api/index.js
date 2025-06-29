const fs = require('fs');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  try {
    // ====== 严格的缓存控制头 ======
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('CDN-Cache-Control', 'no-store'); // 额外CDN控制
    
    // ====== 生成唯一的缓存破坏符 ======
    const cacheBuster = `nocache_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    // ====== 图片源处理 ======
    const externalSource = 'https://raw.githubusercontent.com/xiaoka520/ListFX-API/main/photos.txt';
    const localFile = `${__dirname}/../photos.txt`;
    
    let content = '';
    
    // 尝试从 GitHub 获取最新图片列表（带缓存破坏）
    try {
      const response = await fetch(`${externalSource}?${cacheBuster}`, { 
        timeout: 3000,
        headers: {
          'User-Agent': 'ListFX-Image-API/1.0',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        content = await response.text();
        console.log('成功从 GitHub 获取图片列表');
      } else {
        console.warn(`GitHub 响应状态: ${response.status}`);
      }
    } catch (e) {
      console.warn('GitHub 获取失败:', e.message);
    }
    
    // 回退到本地文件
    if (!content && fs.existsSync(localFile)) {
      content = fs.readFileSync(localFile, 'utf-8');
      console.log('使用本地备份文件');
    }
    
    if (!content) {
      return res.status(503).json({
        error: '图片源不可用',
        code: 503,
        cacheStatus: 'bypassed'
      });
    }
    
    // ====== 处理图片链接 ======
    const links = content.split('\n')
    .map(link => link.trim())
    .filter(link => {
      const isValid = link && 
                  (link.startsWith('https://cdn.mengze.vip/gh/') &&
                   link.includes('@master/img/')) &&
                  /\.webp($|\?)/i.test(link);
    
        return isValid;
      });
    
    if (links.length === 0) {
      return res.status(404).json({
        error: '未找到有效的 WebP 图片链接',
        code: 404,
        cacheStatus: 'bypassed'
      });
    }
    
    // ====== 随机选择图片 ======
    const randomIndex = Math.floor(Math.random() * links.length);
    let randomImageLink = links[randomIndex];
    
    // ====== 添加多级缓存破坏参数 ======
    const separator = randomImageLink.includes('?') ? '&' : '?';
    randomImageLink += `${separator}${cacheBuster}&_v=${Date.now()}`;
    
    console.log(`重定向到: ${randomImageLink}`);
    
    // ====== 最终重定向 ======
    res.redirect(302, randomImageLink);
    
  } catch (error) {
    console.error('未处理的错误:', error);
    res.status(500).json({
      error: '服务器内部错误',
      code: 500,
      message: error.message,
      cacheStatus: 'error'
    });
  }
};
