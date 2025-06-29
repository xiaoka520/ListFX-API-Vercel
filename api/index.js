const fs = require('fs');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  try {
    // 设置响应头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1小时缓存
    
    // 图片列表来源
    const externalSource = 'https://raw.githubusercontent.com/xiaoka520/ListFX-API/main/photos.txt';
    const localFile = `${__dirname}/../photos.txt`;
    
    let content = '';
    let sourceType = '';
    
    // 尝试从 GitHub 获取最新图片列表
    try {
      const response = await fetch(externalSource, { 
        timeout: 3000,
        headers: {
          'User-Agent': 'ListFX-Image-API/1.0 (https://your-vercel-app.vercel.app)'
        }
      });
      
      if (response.ok) {
        content = await response.text();
        sourceType = 'external';
        console.log('Successfully fetched from GitHub');
      } else {
        console.warn(`GitHub responded with status: ${response.status}`);
      }
    } catch (e) {
      console.warn('GitHub fetch failed:', e.message);
    }
    
    // 如果外部源失败，使用本地备份
    if (!content) {
      try {
        if (fs.existsSync(localFile)) {
          content = fs.readFileSync(localFile, 'utf-8');
          sourceType = 'local';
          console.log('Using local backup file');
        }
      } catch (readError) {
        console.error('Error reading local file:', readError.message);
      }
    }
    
    // 如果两个来源都失败
    if (!content) {
      return res.status(503).json({
        error: 'Image source unavailable',
        code: 503,
        message: 'Both GitHub and local sources failed'
      });
    }
    
    // 处理图片链接
    const links = content.split('\n')
      .map(link => link.trim())
      .filter(link => {
        // 验证链接有效性
        const isValid = link && 
                      (link.startsWith('https://cdn.jsdelivr.net/gh/') ||
                       link.startsWith('https://raw.githubusercontent.com/')) &&
                      /\.webp($|\?)/i.test(link);
        
        if (!isValid) {
          console.log(`Invalid link skipped: ${link.substring(0, 50)}...`);
        }
        return isValid;
      });
    
    if (links.length === 0) {
      return res.status(404).json({
        error: 'No valid WebP image links found',
        code: 404,
        source: sourceType,
        contentSample: content.substring(0, 100) + '...' // 提供部分内容用于调试
      });
    }
    
    // 随机选择一个图片链接
    const randomIndex = Math.floor(Math.random() * links.length);
    const randomImageLink = links[randomIndex];
    
    // 添加缓存破坏参数
    const cacheBuster = `?v=${Date.now()}`;
    
    console.log(`Redirecting to: ${randomImageLink} (source: ${sourceType})`);
    res.redirect(302, randomImageLink + cacheBuster);
    
  } catch (error) {
    console.error('Unhandled error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 500,
      message: error.message
    });
  }
};
